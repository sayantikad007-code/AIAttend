import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with the user's token to verify auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating QR for session:', sessionId, 'by user:', user.id);

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

    if (session.classes.professor_id !== user.id) {
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
