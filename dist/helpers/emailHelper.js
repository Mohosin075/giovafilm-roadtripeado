"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailHelper = void 0;
const resend_1 = require("resend");
const config_1 = __importDefault(require("../config"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const resend = new resend_1.Resend(config_1.default.email.resend_api_key);
const getSenderEmail = () => {
    const defaultFrom = 'Roadtripeado <noreply@roadtripeado.com>';
    const configuredFrom = config_1.default.email.from;
    if (!configuredFrom) {
        return defaultFrom;
    }
    // Resend requires a verified domain sender. If misconfigured with @gmail.com or missing @, fallback to verified domain
    if (configuredFrom.includes('@gmail.com') || !configuredFrom.includes('@')) {
        return defaultFrom;
    }
    return configuredFrom;
};
const sendEmail = async (values) => {
    try {
        const attachments = [];
        if (values.attachments && Array.isArray(values.attachments)) {
            for (const att of values.attachments) {
                let content = att.content;
                if (!content &&
                    att.path &&
                    typeof att.path === 'string' &&
                    !att.path.startsWith('http') &&
                    fs_1.default.existsSync(att.path)) {
                    content = fs_1.default.readFileSync(att.path);
                }
                attachments.push({
                    filename: att.filename,
                    content,
                    path: att.path &&
                        !content &&
                        typeof att.path === 'string' &&
                        att.path.startsWith('http')
                        ? att.path
                        : undefined,
                    contentType: att.contentType,
                    contentId: att.contentId || att.cid,
                });
            }
        }
        // Auto-attach inline logo if template references cid:roadtripeado-logo
        if (values.html && values.html.includes('cid:roadtripeado-logo')) {
            const logoPath = path_1.default.join(process.cwd(), 'uploads/images/logo.png');
            if (fs_1.default.existsSync(logoPath)) {
                attachments.push({
                    filename: 'logo.png',
                    content: fs_1.default.readFileSync(logoPath),
                    contentId: 'roadtripeado-logo',
                });
            }
        }
        const from = getSenderEmail();
        const recipients = Array.isArray(values.to)
            ? values.to
            : values.to.includes(',')
                ? values.to.split(',').map((e) => e.trim()).filter(Boolean)
                : [values.to.trim()];
        const { data, error } = await resend.emails.send({
            from,
            to: recipients,
            subject: values.subject,
            html: values.html,
            attachments: attachments.length > 0 ? attachments : undefined,
        });
        if (error) {
            console.error('❌ Resend email failed:', error);
            return { success: false, error };
        }
        console.log('✅ Mail sent successfully via Resend. ID:', data === null || data === void 0 ? void 0 : data.id);
        return { success: true, data };
    }
    catch (error) {
        console.error('❌ Error sending email via Resend:', error);
        return { success: false, error };
    }
};
exports.emailHelper = {
    sendEmail,
    resend,
};
