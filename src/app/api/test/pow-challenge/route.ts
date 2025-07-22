/**
 * Test endpoint for Proof-of-Work system
 * 
 * This endpoint helps test the PoW flow:
 * 1. GET: Returns a test challenge
 * 2. POST: Verifies a solution
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const challenge = crypto.randomBytes(16).toString('hex');
  const difficulty = 3; // Easy difficulty for testing
  
  return NextResponse.json({
    challenge,
    difficulty,
    targetPrefix: '0'.repeat(difficulty),
    algorithm: 'sha256',
    instructions: [
      '1. Find a nonce such that sha256(challenge + nonce) starts with ' + difficulty + ' zeros',
      '2. POST the solution to this endpoint with { "challenge": "' + challenge + '", "solution": "nonce" }',
      '3. Example: If challenge is "abc" and nonce is "123", hash sha256("abc123")'
    ]
  });
}

export async function POST(request: NextRequest) {
  try {
    const { challenge, solution } = await request.json();
    
    if (!challenge || !solution) {
      return NextResponse.json({
        error: 'Missing challenge or solution'
      }, { status: 400 });
    }

    // Calculate hash
    const hash = crypto
      .createHash('sha256')
      .update(challenge + solution)
      .digest('hex');

    // Check if it starts with 3 zeros (test difficulty)
    const isValid = hash.startsWith('000');

    return NextResponse.json({
      valid: isValid,
      hash,
      challenge,
      solution,
      expectedPrefix: '000'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Invalid request'
    }, { status: 400 });
  }
}