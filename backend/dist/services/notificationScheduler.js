"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidScheduleTime = isValidScheduleTime;
exports.getSchedule = getSchedule;
exports.saveSchedule = saveSchedule;
exports.reschedule = reschedule;
exports.startScheduler = startScheduler;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_cron_1 = __importDefault(require("node-cron"));
const notificationDecision_1 = require("./notificationDecision");
const notificationChannels_1 = require("./notificationChannels");
const DEFAULT_SCHEDULE = {
    enabled: false,
    time: '07:00',
    timezone: 'Asia/Jakarta',
    platform: 'whatsapp',
    to: '',
    recipientName: 'Petani',
    customMessage: 'Pengingat harian: cek kondisi cuaca dan rencana kerja hari ini.',
};
const scheduleFilePath = path_1.default.resolve(process.cwd(), 'data', 'notificationSchedule.json');
let currentTask = null;
function ensureDataDir() {
    const dir = path_1.default.dirname(scheduleFilePath);
    fs_1.default.mkdirSync(dir, { recursive: true });
}
function isValidScheduleTime(time) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
    return Boolean(match);
}
function toCronExpression(time) {
    const [hour, minute] = time.split(':').map((value) => Number(value));
    return `${minute} ${hour} * * *`;
}
function getSchedule() {
    ensureDataDir();
    if (!fs_1.default.existsSync(scheduleFilePath)) {
        return { ...DEFAULT_SCHEDULE };
    }
    try {
        const raw = fs_1.default.readFileSync(scheduleFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SCHEDULE, ...parsed };
    }
    catch {
        return { ...DEFAULT_SCHEDULE };
    }
}
function saveSchedule(config) {
    ensureDataDir();
    const merged = { ...DEFAULT_SCHEDULE, ...config };
    fs_1.default.writeFileSync(scheduleFilePath, JSON.stringify(merged, null, 2));
    return merged;
}
async function runScheduledNotification(config) {
    if (!config.enabled || !config.to.trim())
        return;
    const decision = await (0, notificationDecision_1.buildNotificationDecision)({
        platform: config.platform,
        to: config.to,
        recipientName: config.recipientName || 'Petani',
        notificationsEnabled: config.enabled,
        weather: {
            kondisi: 'cerah',
            suhu: 0,
            kelembapan: 0,
            curahHujan: 0,
            kecepatanAngin: 0,
            lokasi: 'Kebun Anda',
        },
        metadata: {
            source: 'daily-notification-scheduler',
            customMessage: config.customMessage,
            locale: 'id',
        },
    });
    if (!decision.shouldSend)
        return;
    await (0, notificationChannels_1.sendDirectNotification)(decision.payload);
}
function stopCurrentTask() {
    if (currentTask) {
        currentTask.stop();
        currentTask = null;
    }
}
function reschedule(config) {
    stopCurrentTask();
    if (!config.enabled || !isValidScheduleTime(config.time)) {
        return;
    }
    const cronExpression = toCronExpression(config.time);
    currentTask = node_cron_1.default.schedule(cronExpression, () => {
        runScheduledNotification(config).catch((error) => {
            console.error('[Notification Scheduler Error]', error);
        });
    }, {
        timezone: config.timezone || DEFAULT_SCHEDULE.timezone,
    });
}
function startScheduler() {
    const schedule = getSchedule();
    reschedule(schedule);
}
