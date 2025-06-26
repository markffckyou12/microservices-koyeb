"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
function registerUser(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const { email, password } = registerSchema.parse(data);
        const existing = yield prisma.user.findUnique({ where: { email } });
        if (existing)
            throw new Error('Email already registered');
        const hashed = yield bcryptjs_1.default.hash(password, 12);
        const user = yield prisma.user.create({ data: { email, password: hashed } });
        return { id: user.id, email: user.email };
    });
}
const loginSchema = registerSchema;
function loginUser(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const { email, password } = loginSchema.parse(data);
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new Error('Invalid credentials');
        const valid = yield bcryptjs_1.default.compare(password, user.password);
        if (!valid)
            throw new Error('Invalid credentials');
        const jwtSecret = process.env.JWT_SECRET;
        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!jwtSecret || !jwtRefreshSecret) {
            throw new Error('JWT secrets not configured');
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, jwtRefreshSecret, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
        return { accessToken, refreshToken };
    });
}
