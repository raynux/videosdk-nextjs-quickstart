'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ZoomVideo, {
  type VideoClient,
  VideoQuality,
  type VideoPlayer,
} from '@zoom/videosdk'

const USER_NAME = `User-${new Date().getTime().toString().slice(8)}`
const VIDEO_WIDTH = 300
const VIDEO_HEIGHT = 169

const roundUpToSecondDecimal = (num: number) => {
  return Math.ceil(num * 100) / 100
}

const TestRoom = (props: { slug: string; JWT: string }) => {
  const clientInitializing = useRef(false)
  const client = useRef<typeof VideoClient>(ZoomVideo.createClient())
  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)
  const [remoteVideoAspectRatio, setRemoteVideoAspectRatio] = useState<
    number | null
  >(null)

  // リモートビデオの拡大率
  const scaleFactor = useMemo(() => {
    if (remoteVideoAspectRatio == null) {
      return 1
    }

    const imageAspect = VIDEO_WIDTH / VIDEO_HEIGHT

    const scale =
      remoteVideoAspectRatio > imageAspect
        ? (remoteVideoAspectRatio * VIDEO_HEIGHT) / VIDEO_WIDTH // コンテンツが画像より横長の場合、高さに基づいてスケール
        : VIDEO_WIDTH / (remoteVideoAspectRatio * VIDEO_HEIGHT) // コンテンツが画像より縦長または同じ場合、横幅に基づいてスケール

    return roundUpToSecondDecimal(scale)
  }, [remoteVideoAspectRatio])

  const joinSession = useCallback(async () => {
    client.current.on('peer-video-state-change', onPeerVideoStateChange)
    client.current.on('video-aspect-ratio-change', onVideoAspectRatioChange)

    await client.current.join(props.slug, props.JWT, USER_NAME).catch((e) => {
      console.error(e, props.slug, props.JWT, USER_NAME)
    })
    console.debug('zoom client joined')

    const mediaStream = client.current.getMediaStream()
    await mediaStream.startVideo({
      // これ、なんか意味ある？ 違いが分からない・・・
      captureHeight: VIDEO_HEIGHT,
      captureWidth: VIDEO_WIDTH,
    })
    console.debug(
      'zoom client started video',
      client.current.getCurrentUserInfo()
    )

    // 初回はイベントが発火しないので、手動で呼び出す
    await onPeerVideoStateChange({
      action: 'Start',
      userId: client.current.getCurrentUserInfo().userId,
    })

    console.debug('zoom client rendered video')
  }, [props.slug, props.JWT])

  //
  // peer-video-state-change イベントハンドラ
  //
  const onPeerVideoStateChange = async (event: {
    action: 'Start' | 'Stop'
    userId: number
  }) => {
    const mediaStream = client.current.getMediaStream()

    if (event.action === 'Stop') {
      const element = await mediaStream.detachVideo(event.userId)
      Array.isArray(element)
        ? element.forEach((el) => el.remove())
        : element.remove()
      return
    }

    const userVideo = await mediaStream.attachVideo(
      event.userId,
      VideoQuality.Video_360P
    )

    // 自分のビデオは localVideoRef に、相手のビデオは remoteVideoRef に追加
    const targetRef =
      event.userId === client.current.getCurrentUserInfo().userId
        ? localVideoRef
        : remoteVideoRef
    targetRef.current!.appendChild(userVideo as VideoPlayer)
  }

  //
  // video-aspect-ratio-change イベントハンドラ
  //
  const onVideoAspectRatioChange = (event: {
    userId: number
    aspectRatio: number
  }) => {
    const { userId, aspectRatio } = event
    if (userId != client.current.getCurrentUserInfo().userId) {
      console.debug('remote video aspect ratio changed', aspectRatio)
      setRemoteVideoAspectRatio(aspectRatio)
    }
  }

  //
  // 初回処理
  //
  useEffect(() => {
    if (clientInitializing.current) return

    console.debug('zoom client initializing')
    clientInitializing.current = true
    client.current
      .init('en-US', 'Global', {
        patchJsMedia: true,
        enforceMultipleVideos: true,
      })
      .then(() => {
        console.debug('zoom client initialized')
        console.debug('USER_NAME', USER_NAME)
        joinSession()
      })
  }, [joinSession])

  return (
    <div className='flex flex-col items-start'>
      {/* ローカルビデオ */}
      <h2 className='font-bold'>Local</h2>
      <div
        className='bg-black mb-5'
        style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}>
        {/* @ts-expect-error html component */}
        <video-player-container ref={localVideoRef} />
      </div>

      {/* リモートビデオ */}
      <h2 className='font-bold'>Remote</h2>
      <div
        className='bg-black overflow-hidden'
        style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}>
        <div
          style={{
            transform: `scale(${scaleFactor})`,
          }}>
          {/* @ts-expect-error html component */}
          <video-player-container ref={remoteVideoRef} />
        </div>
      </div>
    </div>
  )
}

export default TestRoom
