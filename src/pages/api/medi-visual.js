var SUPABASE_URL  = import.meta.env.PUBLIC_SUPABASE_URL;
var SUPABASE_KEY  = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export async function POST({ request }) {
  try {
    var body = await request.json();
    var visual_type = body.visual_type || '';
    var condition = body.condition || '';
    var img_url = '';

    if (visual_type === 'imagen') {
      var prompt = condition + ', medical illustration, clean, professional, labeled, white background';
      img_url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?width=600&height=400&nologo=true';
    }

    /* Guardar en Supabase para que el frontend lo recoja */
    var insertRes = await fetch(SUPABASE_URL + '/rest/v1/medi_visuals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        visual_type: visual_type,
        condition: condition
      })
    });

    if (!insertRes.ok) {
      console.error('Supabase insert error:', await insertRes.text());
    }

    /* Respuesta a ElevenLabs — la IA usa este texto para seguir hablando */
    var message = '';
    if (visual_type === 'ecg') {
      message = 'Se esta mostrando un electrocardiograma con patron de ' + condition + ' en la pantalla del usuario.';
    } else if (visual_type === 'imagen') {
      message = 'Se esta mostrando una imagen de ' + condition + ' en la pantalla del usuario.';
    } else {
      message = 'Se esta mostrando informacion sobre ' + visual_type + ' en la pantalla del usuario.';
    }

    return new Response(JSON.stringify({ message: message, img_url: img_url }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error procesando la solicitud.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
