import express, { type Express } from "express";

import type { AppConfig } from "./config.js";

export const createApp = (_config: AppConfig): Express => {
	return express();
};