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
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Image data is required');
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

    // Use Lovable AI (Gemini) to extract face embedding description
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Extracting face features for user:', user.id);

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
            content: `You are a face analysis system. Analyze the provided face image and extract detailed facial features for identity verification. Return a JSON object with these exact fields:
- face_detected: boolean (true if a clear face is visible)
- face_position: string (centered/left/right)
- face_features: object containing:
  - face_shape: string (oval/round/square/heart/oblong)
  - forehead: string (high/medium/low, wide/narrow)
  - eyebrows: string (thick/thin, arched/straight, close/far)
  - eyes: string (shape, size, spacing)
  - nose: string (shape, size, bridge)
  - mouth: string (shape, size, lips)
  - chin: string (shape, prominence)
  - cheekbones: string (high/low, prominent/subtle)
  - jawline: string (sharp/soft, wide/narrow)
  - skin_tone: string (general description)
  - distinctive_features: array of strings (moles, scars, dimples, etc.)
- embedding_hash: string (generate a unique 64-character hash based on the combined features)
Return ONLY valid JSON, no markdown or explanation.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this face image and extract detailed facial features for identity verification.'
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
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let faceData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      faceData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to analyze face features');
    }

    if (!faceData.face_detected) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No face detected in the image. Please ensure your face is clearly visible.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store the face embedding in the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        face_embedding: JSON.stringify(faceData),
        face_registered_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to save face data');
    }

    console.log('Face registered successfully for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Face registered successfully',
      face_shape: faceData.face_features?.face_shape
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in register-face:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
