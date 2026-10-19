import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import TruckModel from './TruckModel'
import TruckBG from './TruckBg'

/**
 * 3D Background Scene: The truck animation is triggered when the user scrolls
 * down near this section, driving smoothly from right to left across the starry sky.
 */
function Scene({ isActive, triggerId }: { isActive: boolean; triggerId: number }) {
  return (
    <>
      {/* Fog gently blends distant objects into the starfield depth */}
      <fog attach="fog" args={['#000000', 45, 140]} />

      {/* Base ambient light */}
      <ambientLight intensity={0.65} />

      {/* Main Front Headlight / Front Key light highlighting the oncoming truck */}
      <directionalLight
        position={[25, 18, 20]}
        intensity={2.4}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />

      {/* Electric Mint Accent Rim light matching Pixelify theme */}
      <directionalLight position={[0, 8, 25]} intensity={1.6} color="#00FF85" />

      {/* Side fill light */}
      <directionalLight position={[-25, 12, -15]} intensity={0.9} color="#7db8ff" />

      {/* Rear fill light */}
      <directionalLight position={[-15, 6, -20]} intensity={0.5} color="#ffb020" />

      <Suspense fallback={null}>
        <TruckModel
          yaw={Math.PI / 2}
          pathZ={0}
          isActive={isActive}
          triggerId={triggerId}
        />
        <Environment preset="city" />
      </Suspense>
    </>
  )
}

export interface TruckSceneProps {
  className?: string
}

export default function TruckScene({ className = '' }: TruckSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)
  const [triggerId, setTriggerId] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Trigger early (320px ahead of viewport) so truck is already moving right-to-left as user arrives
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          setTriggerId((prev) => prev + 1)
        } else {
          setIsInView(false)
        }
      },
      {
        threshold: 0,
        rootMargin: '320px 0px 320px 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleReplay = () => {
    setTriggerId((prev) => prev + 1)
  }

  return (
    <div
      ref={containerRef}
      className={`truck-scene w-full h-[280px] sm:h-[380px] md:h-[460px] lg:h-[540px] xl:h-[600px] relative overflow-hidden select-none bg-black cursor-pointer ${className}`}
      onClick={handleReplay}
      title="Click to replay drive"
    >
      {/* Dynamic Starfield Particle Canvas Background */}
      <TruckBG className="z-0" backgroundColor="#000000" />

      {/* Top and Bottom gradient vignettes blending into the #050507 page body */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 sm:h-24 bg-gradient-to-b from-[#050507] via-[#050507]/60 to-transparent z-20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 sm:h-24 bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent z-20" />

      {/* 3D WebGL Canvas Layer on transparent background */}
      <div className="absolute inset-0 z-10 w-full h-full pointer-events-auto">
        <Canvas
          shadows
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          camera={{ position: [0, 3.2, 18.5], fov: 40, near: 0.1, far: 400 }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <Scene isActive={isInView} triggerId={triggerId} />
        </Canvas>
      </div>
    </div>
  )
}