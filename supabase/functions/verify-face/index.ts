import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Haversine formula to calculate distance between two GPS coordinates (in meters)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, sessionId, latitude, longitude, accuracy } = await req.json();
    
    if (!imageBase64 || !sessionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Image data and session ID are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GPS is mandatory for face-based attendance
    if (latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Location required: please enable GPS to complete face verification.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid GPS coordinates' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authentication failed' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's stored face embedding from secure table
    const { data: faceRecord, error: faceError } = await supabase
      .from('face_embeddings')
      .select('embedding')
      .eq('user_id', user.id)
      .maybeSingle();

    if (faceError || !faceRecord?.embedding) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Face not registered. Please register your face first.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storedFaceData = JSON.parse(faceRecord.embedding);

    // Verify the session is active
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id, class_id, is_active')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Session not found or not active' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify student is enrolled in the class
    const { data: enrollment } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', session.class_id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (!enrollment) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'You are not enrolled in this class' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -------------------------------
    // Geofence (GPS proximity) check
    // -------------------------------
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('latitude, longitude, proximity_radius_meters, room')
      .eq('id', session.class_id)
      .maybeSingle();

    if (classError || !classData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Classroom location not found for this session.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (classData.latitude === null || classData.longitude === null) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Classroom location is not configured. Please contact your instructor.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedRadius = classData.proximity_radius_meters || 50; // meters
    const distance = calculateDistance(
      latitude,
      longitude,
      classData.latitude,
      classData.longitude
    );

    if (distance > allowedRadius) {
      // Return 200 with success:false so client can read the response body
      return new Response(JSON.stringify({
        success: false,
        error: 'You are not within the classroom proximity.',
        distance: Math.round(distance),
        allowedRadius,
        room: classData.room,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already marked attendance
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (existingRecord) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Attendance already marked for this session' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Lovable AI to analyze current face and compare
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Face verification service unavailable' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract base64 data without the data URL prefix
    let base64Data = imageBase64;
    let mimeType = 'image/jpeg';
    
    if (imageBase64.startsWith('data:')) {
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a face verification system. Compare the face in the provided image against stored facial features and determine if they match the same person.

STORED FACIAL FEATURES:
${JSON.stringify(storedFaceData.face_features, null, 2)}

Analyze the provided image and return a JSON object with:
- face_detected: boolean
- match_score: number between 0 and 1 (similarity score)
- matching_features: array of features that match
- differing_features: array of features that differ
- is_same_person: boolean (true if match_score >= 0.75)
- confidence: string (high/medium/low)
- reason: string (brief explanation)

Return ONLY valid JSON, no markdown or explanation.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this face and compare it with the stored facial features to verify identity.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Face verification API error');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Face verification service error' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No response from verification service');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Face verification failed' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let verificationResult;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      verificationResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Verification response parsing failed');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Face verification failed' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!verificationResult.face_detected) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No face detected in the image. Please ensure your face is clearly visible.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matchScore = verificationResult.match_score || 0;
    const isVerified = verificationResult.is_same_person && matchScore >= 0.75;

    if (!isVerified) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Face verification failed. Match score: ${(matchScore * 100).toFixed(0)}%. Please try again or use QR check-in.`,
        matchScore
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark attendance
    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert({
        session_id: sessionId,
        class_id: session.class_id,
        student_id: user.id,
        method_used: 'face',
        status: 'present',
        verification_score: matchScore
      });

    if (insertError) {
      console.error('Attendance recording failed:', JSON.stringify(insertError));
      // Return 200 with success:false so client can read the response body
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to mark attendance: ' + (insertError.message || 'Unknown error'),
        details: insertError.code
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Face verified! Attendance marked successfully.',
      matchScore,
      confidence: verificationResult.confidence
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Face verification error');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
