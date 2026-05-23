import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

// Simple in-memory rate limiter for login brute-force protection
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record) {
    if (record.lockedUntil && now < record.lockedUntil) {
      const remaining = Math.ceil((record.lockedUntil - now) / 1000 / 60);
      return { blocked: true, remainingMinutes: remaining };
    }
    // Expired lock or within window
    if (record.lockedUntil && now >= record.lockedUntil) {
      loginAttempts.delete(ip);
      return { blocked: false };
    }
  }
  return { blocked: false };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, windowStart: now, lockedUntil: null };
  
  // Reset window if expired
  if (now - record.windowStart > WINDOW_MS) {
    record.count = 0;
    record.windowStart = now;
  }
  
  record.count += 1;
  
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + WINDOW_MS;
  }
  
  loginAttempts.set(ip, record);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

export async function login(req, res, next) {
  // Check rate limit
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(ip);
  if (rateCheck.blocked) {
    return res.status(429).json({ error: `登录尝试过于频繁，请在 ${rateCheck.remainingMinutes} 分钟后再试` });
  }
  try {
    const { username, password } = req.body;
    const [user] = await db('users').where({ username });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password_hash, ...userInfo } = user;
    clearAttempts(ip);
    res.json({ token, user: userInfo });
  } catch (err) { next(err); }
}

export async function getMe(req, res, next) {
  try {
    const [user] = await db('users').where({ id: req.user.id })
      .select('id', 'username', 'name', 'phone', 'role');
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (err) { next(err); }
}

export async function createUser(req, res, next) {
  try {
    const { username, password, name, phone, role } = req.body;

    const existing = await db('users').where({ username }).first();
    if (existing) return res.status(400).json({ error: '用户名已存在' });

    const hash = await bcrypt.hash(password, 10);
    const insertResult = await db('users').insert({ username, password_hash: hash, name, phone, role }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    res.status(201).json({ id, message: '用户创建成功' });
  } catch (err) { next(err); }
}

export async function listUsers(req, res, next) {
  try {
    const users = await db('users')
      .leftJoin('personnel', 'users.personnel_id', 'personnel.id')
      .select('users.id', 'users.username', 'users.name', 'users.phone', 'users.role', 'users.is_active', 'users.personnel_id', 'personnel.name as personnel_name')
      .orderBy('users.name');
    res.json(users);
  } catch (err) { next(err); }
}

export async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: '当前密码和新密码不能为空' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: '新密码长度不能少于6位' });
    }

    const [user] = await db('users').where({ id: req.user.id });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (!(await bcrypt.compare(current_password, user.password_hash))) {
      return res.status(401).json({ error: '当前密码错误' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await db('users').where({ id: req.user.id }).update({ password_hash: hash });

    res.json({ message: '密码修改成功' });
  } catch (err) { next(err); }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { username, name, phone, password, role, personnel_id, is_active } = req.body;

    const [user] = await db('users').where({ id });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (username !== undefined && username !== user.username) {
      const existing = await db('users').where({ username }).whereNot({ id }).first();
      if (existing) return res.status(400).json({ error: '用户名已存在' });
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (personnel_id !== undefined) updateData.personnel_id = personnel_id;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length > 0) {
      await db('users').where({ id }).update(updateData);
    }

    res.json({ message: '用户更新成功' });
  } catch (err) { next(err); }
}


