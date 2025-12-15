import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user token for auth verification
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { sessionId, classId, latitude, longitude, accuracy } = await req.json();

    // Validate required fields
    if (!sessionId || !classId || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid GPS coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the session exists and is active
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('attendance_sessions')
      .select('id, class_id, is_active')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session.is_active) {
      return new Response(
        JSON.stringify({ error: 'Session is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify class ID matches session
    if (session.class_id !== classId) {
      return new Response(
        JSON.stringify({ error: 'Class ID does not match session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify student is enrolled in the class
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('class_enrollments')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', user.id)
      .single();

    if (enrollmentError || !enrollment) {
      return new Response(
        JSON.stringify({ error: 'You are not enrolled in this class' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already checked in
    const { data: existingRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', user.id)
      .single();

    if (existingRecord) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyCheckedIn: true,
          message: 'Your attendance was already recorded for this session' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get class location configuration
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('latitude, longitude, proximity_radius_meters, room')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return new Response(
        JSON.stringify({ error: 'Class not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let distance: number | null = null;
    let verificationScore = 0.5;
    const allowedRadius = classData.proximity_radius_meters || 50;

    // If classroom location is configured, verify proximity
    if (classData.latitude !== null && classData.longitude !== null) {
      distance = calculateDistance(
        latitude,
        longitude,
        classData.latitude,
        classData.longitude
      );

      if (distance > allowedRadius) {
        return new Response(
          JSON.stringify({ 
            error: 'Too far from classroom',
            distance: Math.round(distance),
            allowedRadius,
            room: classData.room
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      verificationScore = Math.max(0, (allowedRadius - distance) / allowedRadius);
    } else {
      // No classroom location configured - use accuracy as score
      verificationScore = accuracy ? Math.max(0, Math.min(1, (100 - accuracy) / 100)) : 0.5;
    }

    // Record attendance
    const { error: insertError } = await supabaseAdmin
      .from('attendance_records')
      .insert({
        session_id: sessionId,
        class_id: classId,
        student_id: user.id,
        method_used: 'proximity',
        status: 'present',
        verification_score: verificationScore,
      });

    if (insertError) {
      // Handle duplicate key error
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            alreadyCheckedIn: true,
            message: 'Your attendance was already recorded for this session' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('Attendance recording failed');
      return new Response(
        JSON.stringify({ error: 'Failed to record attendance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        alreadyCheckedIn: false,
        message: distance !== null 
          ? `Check-in successful! You are ${Math.round(distance)}m from ${classData.room}`
          : 'Check-in successful!',
        distance: distance !== null ? Math.round(distance) : null,
        room: classData.room
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Proximity verification error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
