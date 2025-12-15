import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureData {
  front: string | null;
  left: string | null;
  right: string | null;
  up: string | null;
  blink: string | null;
}

interface FaceAnalysis {
  face_detected: boolean;
  single_face: boolean;
  face_count: number;
  is_real_person: boolean;
  spoof_indicators: string[];
  face_quality: number;
  face_features: {
    face_shape: string;
    forehead: string;
    eyebrows: string;
    eyes: string;
    nose: string;
    mouth: string;
    chin: string;
    cheekbones: string;
    jawline: string;
    skin_tone: string;
    distinctive_features: string[];
  };
  angle_verification: {
    is_front: boolean;
    is_left_turn: boolean;
    is_right_turn: boolean;
    is_looking_up: boolean;
  };
  embedding_signature: string;
}

function extractBase64(imageBase64: string): { mimeType: string; data: string } {
  let base64Data = imageBase64;
  let mimeType = 'image/jpeg';
  
  if (imageBase64.startsWith('data:')) {
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }
  
  return { mimeType, data: base64Data };
}

async function analyzeFaceImage(
  imageBase64: string, 
  expectedAngle: string,
  apiKey: string
): Promise<FaceAnalysis> {
  const { mimeType, data } = extractBase64(imageBase64);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a secure biometric face analysis system. Analyze the provided face image with extreme scrutiny for security purposes.

Your analysis MUST include:
1. FACE DETECTION: Is there exactly one clear human face visible?
2. ANTI-SPOOFING: Check for indicators of a fake/printed/screen-displayed photo:
   - Unnatural lighting or reflections
   - Paper/screen edges visible
   - Moire patterns from screens
   - Lack of 3D depth cues
   - Unnatural skin texture
   - Missing micro-expressions
3. FACE QUALITY: Rate quality from 0-100 based on:
   - Image clarity and focus
   - Proper lighting
   - Face visibility
   - No obstructions
4. ANGLE VERIFICATION: Does the face match the expected angle: "${expectedAngle}"?
5. DETAILED FEATURES: Extract comprehensive facial features for identity matching.

Return ONLY valid JSON with this exact structure:
{
  "face_detected": boolean,
  "single_face": boolean,
  "face_count": number,
  "is_real_person": boolean,
  "spoof_indicators": ["list of any suspicious indicators found"],
  "face_quality": number (0-100),
  "face_features": {
    "face_shape": "oval/round/square/heart/oblong",
    "forehead": "height and width description",
    "eyebrows": "shape and characteristics",
    "eyes": "detailed eye description including shape, size, color, spacing",
    "nose": "shape, size, bridge characteristics",
    "mouth": "shape, size, lip characteristics",
    "chin": "shape and prominence",
    "cheekbones": "prominence description",
    "jawline": "sharpness and width",
    "skin_tone": "general description",
    "distinctive_features": ["moles", "scars", "dimples", etc.]
  },
  "angle_verification": {
    "is_front": boolean,
    "is_left_turn": boolean,
    "is_right_turn": boolean,
    "is_looking_up": boolean
  },
  "embedding_signature": "64-character unique hash based on all facial features combined"
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this face image. Expected angle: ${expectedAngle}. Perform thorough anti-spoofing checks.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${data}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from AI');
  }

  // Parse JSON response
  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleanContent);
}

async function checkForDuplicates(
  supabase: any,
  userId: string,
  newEmbedding: string,
  apiKey: string
): Promise<{ isDuplicate: boolean; matchedUserId?: string }> {
  // Get all existing face embeddings
  const { data: existingEmbeddings, error } = await supabase
    .from('face_embeddings')
    .select('user_id, embedding')
    .neq('user_id', userId);

  if (error || !existingEmbeddings || existingEmbeddings.length === 0) {
    return { isDuplicate: false };
  }

  // Use AI to compare embeddings
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a face embedding comparison system. Compare the new face data against existing face data to detect duplicates.
          
Return JSON: { "is_duplicate": boolean, "highest_similarity": number (0-100), "matched_index": number or null }`
        },
        {
          role: 'user',
          content: `New face data:
${newEmbedding}

Existing face data (array):
${JSON.stringify(existingEmbeddings.map((e: any, i: number) => ({ index: i, embedding: e.embedding })))}`
        }
      ],
    }),
  });

  if (!response.ok) {
    // If comparison fails, allow registration but log warning
    console.warn('Duplicate check failed, allowing registration');
    return { isDuplicate: false };
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content;
  
  if (!content) {
    return { isDuplicate: false };
  }

  try {
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanContent);
    
    if (result.is_duplicate && result.matched_index !== null && result.highest_similarity > 85) {
      return { 
        isDuplicate: true, 
        matchedUserId: existingEmbeddings[result.matched_index]?.user_id 
      };
    }
  } catch {
    // Parse error, allow registration
  }

  return { isDuplicate: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { captures } = await req.json() as { captures: CaptureData };
    
    // Validate all required captures are present
    if (!captures.front || !captures.left || !captures.right || !captures.up || !captures.blink) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'All capture angles are required for secure registration' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authorization required' 
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
        error: 'Unauthorized' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Starting secure face registration for user:', user.id);

    // Analyze all captured angles
    const angleAnalysis: Record<string, FaceAnalysis> = {};
    const angles = [
      { key: 'front', expected: 'front facing' },
      { key: 'left', expected: 'turned slightly left' },
      { key: 'right', expected: 'turned slightly right' },
      { key: 'up', expected: 'looking up' },
      { key: 'blink', expected: 'front facing with natural expression' },
    ];

    for (const angle of angles) {
      const imageData = captures[angle.key as keyof CaptureData];
      if (!imageData) continue;
      
      console.log(`Analyzing ${angle.key} capture...`);
      angleAnalysis[angle.key] = await analyzeFaceImage(imageData, angle.expected, LOVABLE_API_KEY);
    }

    // Validate all captures
    const validationErrors: string[] = [];
    
    // Check face detection in all angles
    for (const [angle, analysis] of Object.entries(angleAnalysis)) {
      if (!analysis.face_detected) {
        validationErrors.push(`No face detected in ${angle} capture`);
      }
      if (!analysis.single_face) {
        validationErrors.push(`Multiple faces detected in ${angle} capture. Only one face allowed.`);
      }
      if (!analysis.is_real_person) {
        validationErrors.push(`Anti-spoofing check failed for ${angle} capture: ${analysis.spoof_indicators.join(', ')}`);
      }
      if (analysis.face_quality < 60) {
        validationErrors.push(`Low quality image in ${angle} capture (${analysis.face_quality}%). Please ensure good lighting and focus.`);
      }
    }

    // Validate angle verification
    if (angleAnalysis.front && !angleAnalysis.front.angle_verification.is_front) {
      validationErrors.push('Front view capture does not show a front-facing face');
    }
    if (angleAnalysis.left && !angleAnalysis.left.angle_verification.is_left_turn) {
      validationErrors.push('Left turn capture does not show face turned left');
    }
    if (angleAnalysis.right && !angleAnalysis.right.angle_verification.is_right_turn) {
      validationErrors.push('Right turn capture does not show face turned right');
    }
    if (angleAnalysis.up && !angleAnalysis.up.angle_verification.is_looking_up) {
      validationErrors.push('Look up capture does not show face tilted up');
    }

    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: validationErrors[0], // Return first error
        all_errors: validationErrors
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create comprehensive embedding from all angles
    const comprehensiveEmbedding = {
      front_features: angleAnalysis.front?.face_features,
      left_features: angleAnalysis.left?.face_features,
      right_features: angleAnalysis.right?.face_features,
      up_features: angleAnalysis.up?.face_features,
      signatures: {
        front: angleAnalysis.front?.embedding_signature,
        left: angleAnalysis.left?.embedding_signature,
        right: angleAnalysis.right?.embedding_signature,
        up: angleAnalysis.up?.embedding_signature,
      },
      quality_scores: {
        front: angleAnalysis.front?.face_quality,
        left: angleAnalysis.left?.face_quality,
        right: angleAnalysis.right?.face_quality,
        up: angleAnalysis.up?.face_quality,
      },
      registered_at: new Date().toISOString(),
      registration_method: 'multi_angle_secure',
    };

    const embeddingJson = JSON.stringify(comprehensiveEmbedding);

    // Check for duplicate registrations
    console.log('Checking for duplicate registrations...');
    const duplicateCheck = await checkForDuplicates(supabase, user.id, embeddingJson, LOVABLE_API_KEY);
    
    if (duplicateCheck.isDuplicate) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'This face appears to be already registered with another account. Please contact support if you believe this is an error.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store the comprehensive face embedding
    const { data: existingFace } = await supabase
      .from('face_embeddings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let dbError;
    if (existingFace) {
      const { error } = await supabase
        .from('face_embeddings')
        .update({ 
          embedding: embeddingJson,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      dbError = error;
    } else {
      const { error } = await supabase
        .from('face_embeddings')
        .insert({ 
          user_id: user.id,
          embedding: embeddingJson
        });
      dbError = error;
    }

    if (dbError) {
      console.error('Database error:', dbError.message);
      throw new Error('Failed to save face data');
    }

    console.log('Secure face registration successful for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Face registered securely with multi-angle verification',
      quality_score: Math.round(
        (angleAnalysis.front?.face_quality || 0 + 
         angleAnalysis.left?.face_quality || 0 + 
         angleAnalysis.right?.face_quality || 0 + 
         angleAnalysis.up?.face_quality || 0) / 4
      )
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Secure registration error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Registration failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
