-- Tasa de cambio manual Bs/USD para el cálculo de precios y el panel.
ALTER TABLE "system_config" ADD COLUMN "bs_rate" DOUBLE PRECISION NOT NULL DEFAULT 0;
