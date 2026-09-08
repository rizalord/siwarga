import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import type { ForumPost } from '@/types/api'
import { useCreatePost, useForumPosts, useForumThread } from '@/hooks/use-forum'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

function formatPostDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PostCard({ post }: { post: ForumPost }) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
          <span className='font-medium'>{post.user_name ?? 'Warga'}</span>
          {post.created_at ? (
            <span className='text-muted-foreground'>
              {formatPostDate(post.created_at)}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {/* Post content is sanitized server-side before storage; safe to render as HTML. */}
        <div
          className='text-sm leading-relaxed'
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </CardContent>
    </Card>
  )
}

function ForumThreadDetailPageInner() {
  const { threadId } = useParams({ from: '/_authenticated/forum/$threadId' })
  const id = Number(threadId)

  const {
    data: thread,
    isLoading: threadLoading,
    isError: threadError,
    refetch: refetchThread,
  } = useForumThread(id)
  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts,
  } = useForumPosts(id)
  const createPost = useCreatePost(id)

  const [draft, setDraft] = useState('')

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault()
    const content = draft.trim()
    if (!content || createPost.isPending) return
    createPost.mutate(content, {
      onSuccess: () => setDraft(''),
    })
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <Link
          to='/forum'
          className='w-fit text-sm text-muted-foreground hover:underline'
        >
          &larr; Kembali ke forum
        </Link>

        {threadLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : threadError || !thread ? (
          <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-md border py-12'>
            <p className='text-muted-foreground'>Gagal memuat diskusi.</p>
            <Button variant='outline' size='sm' onClick={() => refetchThread()}>
              Coba lagi
            </Button>
          </div>
        ) : (
          <>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                {thread.title}
              </h2>
              <p className='text-muted-foreground'>
                {thread.created_by_name ?? 'Warga'} · {thread.posts_count}{' '}
                balasan
              </p>
            </div>

            {postsLoading ? (
              <div className='flex items-center justify-center py-8'>
                <p className='text-muted-foreground'>Memuat balasan...</p>
              </div>
            ) : postsError ? (
              <div className='flex flex-col items-center justify-center gap-3 rounded-md border py-12'>
                <p className='text-muted-foreground'>Gagal memuat balasan.</p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetchPosts()}
                >
                  Coba lagi
                </Button>
              </div>
            ) : (posts?.data ?? []).length === 0 ? (
              <div className='flex items-center justify-center rounded-md border'>
                <p className='py-12 text-muted-foreground'>
                  Belum ada balasan. Jadilah yang pertama membalas.
                </p>
              </div>
            ) : (
              <div className='flex flex-col gap-3'>
                {(posts?.data ?? []).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base'>Tulis balasan</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReply} className='flex flex-col gap-2'>
                  <Textarea
                    placeholder='Tulis balasan'
                    aria-label='Tulis balasan'
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                  />
                  <div>
                    <Button type='submit' disabled={createPost.isPending}>
                      {createPost.isPending ? 'Mengirim...' : 'Kirim Balasan'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </Main>
    </>
  )
}

export function ForumThreadDetailPage() {
  return <ForumThreadDetailPageInner />
}
