import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const LOOPMESSAGE_BASE_URL = "https://server.loopmessage.com";
const LOOPMESSAGE_API_PATH = "/api/v1/message/send/";

// API Keys
const LOOPMESSAGE_AUTH_KEY = "CXEASDQ26-7CWOBKO79-8XRICPJY6-2WCW3L8LW";
const LOOPMESSAGE_SECRET_KEY = "GxHU74-wdcYGx-eLNyVllLdBkc0Su1SKiFmZASH0WxxoOjfbl7jTB1GEoC5cXdMa";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    console.log('🚀 Starting message send process...');
    
    const { group_id, content, sender_name, team_member_id, attachments } = await req.json();
    
    console.log('📥 Request payload:', {
      group_id,
      content: content?.substring(0, 50) + '...',
      sender_name,
      team_member_id,
      attachments: attachments ? `${attachments.length} attachment(s)` : 'none'
    });

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    console.log('🔑 Supabase URL configured:', !!supabaseUrl);
    console.log('🔑 Service role key configured:', !!supabaseServiceKey);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Step 1: Send message via LoopMessage API
    const payload: any = {
      group: group_id,
      text: content,
      sender_name: "creatorsupport@a.imsg.co"
    };

    // Add attachments if provided (max 3 URLs)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      payload.attachments = attachments.slice(0, 3); // LoopMessage API max is 3
      console.log('📎 Including attachments:', attachments.length);
    }

    console.log('📤 Sending to LoopMessage API:', payload);

    const response = await fetch(`${LOOPMESSAGE_BASE_URL}${LOOPMESSAGE_API_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LOOPMESSAGE_AUTH_KEY,
        'Loop-Secret-Key': LOOPMESSAGE_SECRET_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ LoopMessage API error:', response.status, errorText);
      throw new Error(`LoopMessage API error: ${response.status} ${errorText}`);
    }

    const loopMessageData = await response.json();
    console.log('✅ LoopMessage API success:', loopMessageData);
    console.log('📋 Full LoopMessage response:', JSON.stringify(loopMessageData));

    // Step 2: Wait for webhook to insert the message, then update it
    // The webhook typically inserts within 1-2 seconds
    const messageId = loopMessageData.message_id;
    
    if (messageId && team_member_id) {
      console.log(`🔍 Looking for message with message_id: ${messageId}`);
      
      // Poll for the message with retries (webhook can take 2-5 seconds)
      let existingMessage = null;
      let attempt = 0;
      const maxAttempts = 10;
      const delayMs = 500;
      
      while (!existingMessage && attempt < maxAttempts) {
        attempt++;
        console.log(`⏳ Attempt ${attempt}/${maxAttempts} - waiting ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        const { data: messageMatches, error: searchError } = await supabase
          .from('messages')
          .select('id, thread_id, message_id, sender_name, sent_by_team_member_id')
          .eq('message_id', messageId);
        
        if (searchError) {
          console.error('🔍 Search error:', searchError);
        }
        
        if (messageMatches && messageMatches.length > 0) {
          existingMessage = messageMatches[0];
          console.log(`✅ Found message on attempt ${attempt}:`, JSON.stringify(existingMessage));
        } else {
          console.log(`⏳ Message not found yet (attempt ${attempt}/${maxAttempts})`);
        }
      }
      
      const findError = !existingMessage ? { code: 'NOT_FOUND', message: 'Message not found after all retries' } : null;

      if (findError) {
        console.error('❌ Could not find message after webhook:', findError);
        console.log('🔄 Attempting to find by text content as fallback...');
        
        // Fallback: Find by group and recent text
        const { data: threadData } = await supabase
          .from('threads')
          .select('id')
          .eq('group_id', group_id)
          .single();
          
        if (threadData) {
          const { data: recentMessage } = await supabase
            .from('messages')
            .select('id, message_id')
            .eq('thread_id', threadData.id)
            .eq('text', content)
            .eq('direction', 'outbound')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (recentMessage) {
            console.log('✅ Found message via fallback:', recentMessage.message_id);
            console.log('📝 Attempting to update message ID:', recentMessage.id);
            console.log('📝 With team_member_id:', team_member_id);
            
            const { data: updateData, error: updateError } = await supabase
              .from('messages')
              .update({
                sent_by_team_member_id: team_member_id,
                sender_name: sender_name || 'Team Member'
              })
              .eq('id', recentMessage.id)
              .select('id, message_id, sent_by_team_member_id, sender_name');
              
            if (updateError) {
              console.error('❌ Error updating via fallback:', updateError);
              console.error('❌ Full error details:', JSON.stringify(updateError));
            } else {
              console.log('✅ Updated message with team_member_id via fallback');
              console.log('📋 Updated message data:', JSON.stringify(updateData));
            }
          }
        }
      } else {
        console.log('✅ Found message:', existingMessage);
        console.log(`📝 Current sent_by_team_member_id: ${existingMessage.sent_by_team_member_id}`);
        console.log('📝 Attempting to update message_id:', messageId);
        console.log('📝 With team_member_id:', team_member_id);
        
        // Update the message with team_member_id
        const { data: updateData, error: updateError } = await supabase
          .from('messages')
          .update({
            sent_by_team_member_id: team_member_id,
            sender_name: sender_name || 'Team Member'
          })
          .eq('message_id', messageId)
          .select('id, message_id, sent_by_team_member_id, sender_name');

        if (updateError) {
          console.error('❌ Error updating message:', updateError);
          console.error('❌ Full error details:', JSON.stringify(updateError));
        } else {
          console.log(`✅ Successfully updated message with team_member_id: ${team_member_id}`);
          console.log('📋 Updated message data:', JSON.stringify(updateData));
        }
      }
    } else {
      if (!messageId) {
        console.warn('⚠️  No message_id returned from LoopMessage API');
      }
      if (!team_member_id) {
        console.warn('⚠️  No team_member_id provided in request');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message_sent: true,
      loop_message_data: loopMessageData,
      logged_by: sender_name || 'Team Member',
      team_member_id: team_member_id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('💥 Error in message send process:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Check edge function logs for more information'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});