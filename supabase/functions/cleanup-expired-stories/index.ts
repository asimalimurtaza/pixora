import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Initialize Supabase Admin Client using privileged service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch all expired stories (expires_at <= NOW())
    const { data: expiredStories, error: fetchErr } = await supabase
      .from('stories')
      .select('id, media_path')
      .lte('expires_at', new Date().toISOString())

    if (fetchErr) {
      console.error('Error querying expired stories:', fetchErr)
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!expiredStories || expiredStories.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired stories found to clean up.', deleted_stories: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const storyIds = expiredStories.map((s) => s.id)
    const storagePaths = expiredStories.map((s) => s.media_path).filter((p): p is string => Boolean(p))

    // 2. Physical Storage Object Deletion
    let deletedMediaCount = 0
    if (storagePaths.length > 0) {
      const { data: storageDelData, error: storageErr } = await supabase.storage
        .from('story-media')
        .remove(storagePaths)

      if (storageErr) {
        console.error('Failed to purge storage files:', storageErr)
      } else if (storageDelData) {
        deletedMediaCount = storageDelData.length
      }
    }

    // 3. Physical Database Rows Purge (story_views first, then stories)
    await supabase.from('story_views').delete().in('story_id', storyIds)
    const { error: dbDeleteErr } = await supabase.from('stories').delete().in('id', storyIds)

    if (dbDeleteErr) {
      console.error('Error deleting expired database records:', dbDeleteErr)
      return new Response(JSON.stringify({ error: dbDeleteErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(
      `Cleanup completed: Removed ${expiredStories.length} expired stories and ${deletedMediaCount} media files.`
    )

    return new Response(
      JSON.stringify({
        success: true,
        deleted_stories: expiredStories.length,
        deleted_media: deletedMediaCount,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Unhandled cleanup exception:', err)
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
