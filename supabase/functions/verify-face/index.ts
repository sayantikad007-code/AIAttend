import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, sessionId } = await req.json();
    
    if (!imageBase64 || !sessionId) {
      throw new Error('Image data and session ID are required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's stored face embedding
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('face_embedding, name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.face_embedding) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Face not registered. Please register your face first.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storedFaceData = JSON.parse(profile.face_embedding);

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

    // Check if already marked attendance
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', user.id)
      .single();

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
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Verifying face for user:', user.id);

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
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`AI verification failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('Verification response:', content);

    let verificationResult;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      verificationResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to verify face');
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
      console.error('Failed to insert attendance record:', insertError);
      throw new Error('Failed to mark attendance');
    }

    console.log('Face verification successful for user:', user.id, 'Score:', matchScore);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Face verified! Attendance marked successfully.',
      matchScore,
      confidence: verificationResult.confidence
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-face:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
