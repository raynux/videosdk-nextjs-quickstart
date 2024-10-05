import { getData } from '@/data/getToken'
import dynamic from 'next/dynamic'
import Script from 'next/script'

const TestRoom = dynamic<{ slug: string; JWT: string }>(
  () => import('../../../components/TestRoom'),
  { ssr: false }
)

export default async function Page({ params }: { params: { slug: string } }) {
  const jwt = await getData(params.slug)
  return (
    <main className='p-4'>
      <h1 className='font-bold mb-4'>Zoom Video Experiment</h1>
      <TestRoom slug={params.slug} JWT={jwt} />
      <Script src='/coi-serviceworker.js' strategy='beforeInteractive' />
    </main>
  )
}
