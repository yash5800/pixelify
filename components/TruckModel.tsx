import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Meshes that roll (left/right wheels of all four axles)
const WHEEL_NAMES = [
  'tire_01_1', 'tire_01_3',
  'tire_02_1', 'tire_02_3',
  'tire_03_1', 'tire_03_3',
  'tire_04_1', 'tire_04_3',
]

// Offsets that put the truck's geometric center on the group origin
// and its wheels on the floor. (Model spans -2.76..16.6 on z, -0.03..4.02 on y)
const CENTER_OFFSET: [number, number, number] = [0, 0, -6.923]

export interface TruckModelProps {
  travelStart?: number
  travelEnd?: number
  duration?: number
  yaw?: number
  pathZ?: number
  scale?: number
  isActive?: boolean
  triggerId?: number
}

/**
 * Responsive Scroll-triggered 3D Truck Model:
 * Drives smoothly from right to left across the screen. Dynamically calculates
 * viewport edge bounds so it enters immediately without empty off-screen delays,
 * and continuously continues moving in an endless highway loop.
 */
function TruckModel({
  travelStart,
  travelEnd,
  duration,
  yaw = Math.PI / 2,
  pathZ = 0,
  scale,
  isActive = false,
  triggerId = 0,
}: TruckModelProps) {
  const { scene } = useGLTF('/truck.glb')
  const { viewport } = useThree()
  const groupRef = useRef<any>(null)
  const wheelsRef = useRef<any[]>([])

  // Responsive scale: adapt slightly for smaller viewports so the truck is well-proportioned
  const effectiveScale =
    scale ?? (viewport.width < 18 ? 1.15 : viewport.width < 28 ? 1.35 : 1.55)

  // Truck model spans ~19.36 units along z (half-length ~9.68). With effectiveScale:
  const halfTruckLength = 9.68 * effectiveScale
  const halfScreenWidth = viewport.width / 2

  // Start position: front bumper is positioned just outside the right edge (+1.2 units)
  const actualStart =
    travelStart !== undefined
      ? travelStart
      : halfScreenWidth + halfTruckLength + 1.2

  // End position: rear bumper fully exits past the left edge (-2.0 units)
  const actualEnd =
    travelEnd !== undefined
      ? travelEnd
      : -halfScreenWidth - halfTruckLength - 2.5

  const totalDistance = Math.abs(actualEnd - actualStart)
  // Constant physical road cruise speed ~7.5 units/second across all screen sizes
  const actualDuration =
    duration !== undefined ? duration : Math.max(5.0, totalDistance / 7.5)

  // Collect wheel meshes from model
  useEffect(() => {
    if (!scene) return
    const wheels: any[] = []
    scene.traverse((child: any) => {
      if (child.isMesh && WHEEL_NAMES.includes(child.name)) {
        wheels.push(child)
      }
    })
    wheelsRef.current = wheels
  }, [scene])

  // Keep group at actualStart initially
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.position.x = actualStart
    group.position.z = pathZ
  }, [actualStart, pathZ])

  // Trigger drive from right to left when isActive becomes true or triggerId changes
  useEffect(() => {
    const group = groupRef.current
    if (!group || !scene) return

    // Scrolled out of view: reset to start
    if (!isActive) {
      gsap.killTweensOf(group.position)
      wheelsRef.current.forEach((wheel) => gsap.killTweensOf(wheel.rotation))
      group.position.x = actualStart
      wheelsRef.current.forEach((wheel) => {
        wheel.rotation.x = 0
      })
      return
    }

    // Scrolled into view / active: trigger drive animation from right to left
    gsap.killTweensOf(group.position)
    wheelsRef.current.forEach((wheel) => gsap.killTweensOf(wheel.rotation))

    group.position.x = actualStart
    wheelsRef.current.forEach((wheel) => {
      wheel.rotation.x = 0
    })

    // Wheel rotation proportional to distance traveled so tires roll accurately on asphalt
    const wheelAngle = (totalDistance * 0.912) * (1.55 / effectiveScale)
    const direction = actualEnd < actualStart ? -1 : 1

    // Smooth drive across viewport - loops continuously as long as user remains on the section
    gsap.fromTo(
      group.position,
      { x: actualStart },
      {
        x: actualEnd,
        duration: actualDuration,
        delay: 0.1, // Near-instant start so it immediately sweeps in when user arrives
        ease: 'none',
        repeat: -1,
        repeatDelay: 0.8, // Brief realistic gap between highway passes
      }
    )

    // Wheels rolling synchronously on loop
    wheelsRef.current.forEach((wheel) => {
      gsap.fromTo(
        wheel.rotation,
        { x: 0 },
        {
          x: wheelAngle * direction,
          duration: actualDuration,
          delay: 0.1,
          ease: 'none',
          repeat: -1,
          repeatDelay: 0.8,
        }
      )
    })

    return () => {
      gsap.killTweensOf(group.position)
      wheelsRef.current.forEach((wheel) => gsap.killTweensOf(wheel.rotation))
    }
  }, [isActive, triggerId, scene, actualStart, actualEnd, actualDuration, totalDistance, effectiveScale])

  return (
    <group
      ref={groupRef}
      position={[actualStart, -2.2, pathZ]}
      rotation={[0, yaw, 0]}
      scale={effectiveScale}
    >
      <group position={CENTER_OFFSET}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

export default TruckModel