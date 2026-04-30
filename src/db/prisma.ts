import { Prisma, PrismaClient } from '@prisma/client';

const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1017']);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientPrismaError = (error: unknown) => {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		return TRANSIENT_PRISMA_CODES.has(error.code);
	}

	if (error instanceof Prisma.PrismaClientInitializationError) {
		return true;
	}

	if (error instanceof Prisma.PrismaClientRustPanicError) {
		return true;
	}

	const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? '';
	return message.includes("can't reach database server") || message.includes('connection');
};

export const prismaRaw = new PrismaClient({
	log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export const prisma = prismaRaw.$extends({
	query: {
		$allModels: {
			async $allOperations({ args, query }) {
				const maxRetries = 3;

				for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
					try {
						return await query(args);
					} catch (error) {
						const shouldRetry = isTransientPrismaError(error) && attempt < maxRetries;
						if (!shouldRetry) {
							throw error;
						}

						await sleep(250 * attempt);
					}
				}

				return query(args);
			},
		},
	},
});

export const ensurePrismaConnected = async (options?: {
	maxAttempts?: number;
	initialDelayMs?: number;
}) => {
	const maxAttempts = options?.maxAttempts ?? 8;
	const initialDelayMs = options?.initialDelayMs ?? 600;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			await prismaRaw.$connect();
			if (attempt > 1) {
				console.log(`[DB] Conectado a la base de datos en intento ${attempt}.`);
			}
			return;
		} catch (error) {
			const lastAttempt = attempt === maxAttempts;
			const message = (error as { message?: string } | null)?.message ?? String(error);
			console.warn(`[DB] Intento ${attempt}/${maxAttempts} fallido: ${message}`);

			if (lastAttempt) {
				throw error;
			}

			await sleep(initialDelayMs * attempt);
		}
	}
};
