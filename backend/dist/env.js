"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const envCandidates = [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(process.cwd(), '.env.local'),
    path_1.default.resolve(process.cwd(), '../.env'),
    path_1.default.resolve(process.cwd(), '../.env.local'),
];
for (const envPath of envCandidates) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
    }
}
