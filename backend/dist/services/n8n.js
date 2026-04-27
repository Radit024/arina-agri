"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendN8nNotification = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sendN8nNotification = async (payload) => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (!webhookUrl) {
        console.error('N8N_WEBHOOK_URL is not defined in environment variables');
        throw new Error('N8N_WEBHOOK_URL is missing in environment variables');
    }
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (webhookSecret) {
            headers.Authorization = `Bearer ${webhookSecret}`;
        }
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`n8n webhook error: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Failed to send notification via n8n: ${response.statusText}`);
        }
        // Terkadang n8n mereturn tipe content yang berbeda, kita amankan parsing json-nya
        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        }
        else {
            data = await response.text();
        }
        return { success: true, data };
    }
    catch (error) {
        console.error('Error sending notification to n8n:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};
exports.sendN8nNotification = sendN8nNotification;
