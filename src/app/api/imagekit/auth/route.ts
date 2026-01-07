import imagekit from '@/lib/imagekit-server';
import { NextRequest, NextResponse } from 'next/server';

// ImageKit authentication endpoint
export async function GET(request: NextRequest) {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();

    return NextResponse.json(authenticationParameters);
  } catch (error) {
    console.error('ImageKit auth error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate authentication parameters',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
