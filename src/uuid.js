// ══════════════════════════════════════════════════════════════
// uuid.js — 玩家 / AI UUID（方案 A）
// 玩家 UUID：Cookie 持久化，XXXX-XXXX-XXXX-XXXX（4段×4位十六进制）
// AI UUID  ：复制玩家前三段，尾段固定 1111/2222/3333
// ══════════════════════════════════════════════════════════════

const UUID_COOKIE = 'playerUUID';

function randHex(len) {
    return Math.floor(Math.random() * Math.pow(16, len))
        .toString(16).padStart(len, '0').toUpperCase();
}

// 读取或生成玩家 UUID（Cookie 有效期 1 年）
function getPlayerUUID() {
    const match = document.cookie.match(new RegExp(UUID_COOKIE + '=([^;]+)'));
    if (match) return match[1];
    const uuid = `${randHex(4)}-${randHex(4)}-${randHex(4)}-${randHex(4)}`;
    document.cookie = `${UUID_COOKIE}=${uuid}; path=/; max-age=31536000`;
    return uuid;
}

// 方案 A：根据玩家 UUID 派生 AI UUID
function generateAIUUID(playerUUID, aiIndex) {
    const parts = playerUUID.split('-');
    const fixedLasts = ['1111', '2222', '3333'];
    return `${parts[0]}-${parts[1]}-${parts[2]}-${fixedLasts[aiIndex]}`;
}

// 掩码：仅保留首尾段，中间两段用星号（A-XX-XX-D）
function maskUUID(uuid) {
    if (!uuid) return '';
    const parts = uuid.split('-');
    if (parts.length !== 4) return uuid;
    return `${parts[0]}-****-****-${parts[3]}`;
}
