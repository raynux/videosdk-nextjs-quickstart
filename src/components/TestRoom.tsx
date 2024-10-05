'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ZoomVideo, {
  type VideoClient,
  VideoQuality,
  type VideoPlayer,
} from '@zoom/videosdk'

const USER_NAME = `User-${new Date().getTime().toString().slice(8)}`

const TestRoom = (props: { slug: string; JWT: string }) => {
  const clientInitializing = useRef(false)
  const client = useRef<typeof VideoClient>(ZoomVideo.createClient())
  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)

  const joinSession = useCallback(async () => {
    client.current.on('peer-video-state-change', onPeerVideoStateChange)
    client.current.on('video-aspect-ratio-change', onVideoAspectRatioChange)

    await client.current.join(props.slug, props.JWT, USER_NAME).catch((e) => {
      console.error(e, props.slug, props.JWT, USER_NAME)
    })
    console.debug('zoom client joined')

    const mediaStream = client.current.getMediaStream()
    await mediaStream.startVideo({
      originalRatio: true,
    })
    console.debug('zoom client started video')

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

  const onVideoAspectRatioChange = (event: {
    userId: number
    aspectRatio: number
  }) => {
    console.debug('video aspect ratio changed', event)

    // const { userId, aspectRatio } = event
    // const width = 300 // 任意の幅
    // const height = width / aspectRatio

    // const mediaStream = client.current.getMediaStream()
    // const targetRef =
    //   event.userId === client.current.getCurrentUserInfo().userId
    //     ? localVideoRef
    //     : remoteVideoRef

    // mediaStream.adjustRenderedVideoPosition(
    //   targetRef.current,
    //   userId,
    //   width,
    //   height,
    //   0,
    //   0
    // )
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
      <div className='w-[300px] h-[169px] bg-black mb-5'>
        {/* @ts-expect-error html component */}
        <video-player-container ref={localVideoRef} />
      </div>

      {/* リモートビデオ */}
      <h2 className='font-bold'>Remote</h2>
      <div className='w-[300px] h-[169px] bg-black'>
        {/* @ts-expect-error html component */}
        <video-player-container ref={remoteVideoRef} />
      </div>
    </div>
  )
}

export default TestRoom