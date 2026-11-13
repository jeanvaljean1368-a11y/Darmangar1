// Authentication utilities for درمانگر app

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { JWT_SECRET, JWT_EXPIRES_IN, DEFAULT_ADMIN } from './constants'
import { db } from './db'

export interface ProviderTokenPayload {
  providerId: string
  username: string
  role: 'provider'
}

export interface AdminTokenPayload {
  adminId: string
  username: string
  role: 'admin'
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generate JWT for provider
export function signProviderToken(payload: ProviderTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Generate JWT for admin
export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Verify token
export function verifyToken(token: string): ProviderTokenPayload | AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ProviderTokenPayload | AdminTokenPayload
  } catch {
    return null
  }
}

// Get provider from request cookies/headers
export async function getProviderFromRequest(request: Request): Promise<{ id: string; username: string } | null> {
  const authHeader = request.headers.get('authorization')
  let token: string | undefined

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    // Try cookie
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(/(?:^|;\s*)provider-token=([^;]+)/)
    token = match?.[1]
  }

  if (!token) return null
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'provider') return null

  // Verify provider exists and is approved
  const provider = await db.provider.findUnique({
    where: { id: payload.providerId },
    select: { id: true, username: true, status: true },
  })
  if (!provider) return null
  return { id: provider.id, username: provider.username }
}

// Get admin from request
export async function getAdminFromRequest(request: Request): Promise<{ id: string; username: string } | null> {
  const authHeader = request.headers.get('authorization')
  let token: string | undefined

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(/(?:^|;\s*)admin-token=([^;]+)/)
    token = match?.[1]
  }

  if (!token) return null
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'admin') return null
  return { id: payload.adminId, username: payload.username }
}

// Ensure default admin exists
export async function ensureDefaultAdmin(): Promise<void> {
  const existing = await db.admin.findFirst()
  if (!existing) {
    const hashed = await hashPassword(DEFAULT_ADMIN.password)
    await db.admin.create({
      data: {
        username: DEFAULT_ADMIN.username,
        password: hashed,
      },
    })
    console.log('Default admin created:', DEFAULT_ADMIN.username)
  }
}
