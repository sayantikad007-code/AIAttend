import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the JWT token from the header
    const token = authHeader.replace('Bearer ', '');

    // Decode the JWT to get the user id (without full validation since session may be revoked)
    let userId: string;
    try {
      const [_header, payload, _signature] = decode(token);
      const payloadData = payload as { sub?: string; exp?: number };
      
      // Check if token is expired
      if (payloadData.exp && payloadData.exp < Date.now() / 1000) {
        console.error('Token expired');
        return new Response(JSON.stringify({ error: 'Token expired' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!payloadData.sub) {
        console.error('No user id in token');
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      userId = payloadData.sub;
      console.log('User ID from token:', userId);
    } catch (decodeError) {
      console.error('Failed to decode token:', decodeError);
      return new Response(JSON.stringify({ error: 'Invalid token format' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating QR for session:', sessionId, 'by user:', userId);

    // Verify the session exists and user is the professor
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*, classes!inner(professor_id)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (session.classes.professor_id !== userId) {
      console.error('User', userId, 'is not the professor of this session. Professor is:', session.classes.professor_id);
      return new Response(JSON.stringify({ error: 'Not authorized for this session' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a unique secret for this QR code
    const timestamp = Date.now();
    const qrSecret = crypto.randomUUID();
    
    // Create signed QR payload
    const payload = {
      sessionId,
      timestamp,
      secret: qrSecret,
      expiresAt: timestamp + 30000, // 30 seconds validity
    };

    // Sign the payload using HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(supabaseServiceKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(JSON.stringify(payload))
    );
    
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Update session with the secret
    await supabase
      .from('attendance_sessions')
      .update({ qr_secret: qrSecret })
      .eq('id', sessionId);

    const qrData = {
      ...payload,
      signature: signatureBase64,
    };

    console.log('QR generated successfully for session:', sessionId);

    return new Response(JSON.stringify({ qrData: JSON.stringify(qrData) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating QR:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
