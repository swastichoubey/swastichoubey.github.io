import { useRef, useState, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import { useSpring, animated } from "@react-spring/three"
import * as THREE from "three"
import { THEME } from "./theme"
import { glassChip } from "./glass"

// Each moon gets its own elliptical orbit: semi-major axis, eccentricity,
// inclination, starting phase. Speeds follow Kepler's second law — moons
// sweep faster near perihelion — which is what makes the motion read as
// gravitational rather than mechanical.
const MOONS = [
  { id: "about-me",   label: "About Me",   view: "about",      a: 4.6, ecc: 0.16, incl:  0.10, yaw: 0.0,  phase: 0.0,  speed: 0.22 },
  { id: "experience", label: "Experience", view: "experience", a: 5.4, ecc: 0.22, incl: -0.14, yaw: 1.05, phase: 2.1,  speed: 0.17 },
  { id: "education",  label: "Education",  view: "education",  a: 6.1, ecc: 0.12, incl:  0.20, yaw: 2.10, phase: 4.2,  speed: 0.14 },
  { id: "work",       label: "Work",       view: "work",       a: 5.0, ecc: 0.26, incl: -0.07, yaw: 3.15, phase: 1.0,  speed: 0.19 },
  { id: "socials",    label: "Socials",    view: "socials",    a: 6.6, ecc: 0.18, incl:  0.16, yaw: 4.20, phase: 5.3,  speed: 0.12 },
  { id: "contact",    label: "Contact Me", view: "contact",    a: 5.8, ecc: 0.20, incl: -0.18, yaw: 5.25, phase: 3.2,  speed: 0.15 },
]

const color = THEME.about

// Faint elliptical orbit path (planet at the focus)
function OrbitPath({ a, ecc, opacity }) {
  const posArray = useMemo(() => {
    const pts = []
    const steps = 96
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * Math.PI * 2
      const r  = (a * (1 - ecc * ecc)) / (1 + ecc * Math.cos(th))
      pts.push(Math.cos(th) * r, 0, Math.sin(th) * r)
    }
    return new Float32Array(pts)
  }, [a, ecc])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={posArray.length / 3} array={posArray} itemSize={3} />
      </bufferGeometry>
      <animated.lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  )
}

function Moon({ moon, progress, isActive, onClick }) {
  const groupRef = useRef()
  const thetaRef = useRef(moon.phase)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)

  // Hover spring — slight overshoot so the moon "catches" your cursor
  const { scale } = useSpring({
    scale: hovered ? 1.45 : isActive ? 1.18 : 1.0,
    config: { mass: 0.8, tension: 420, friction: 20 },
  })

  useFrame((_, dt) => {
    const p = progress.get()
    if (groupRef.current) groupRef.current.visible = p > 0.02
    if (visible !== p > 0.5) setVisible(p > 0.5)
    if (p < 0.02 || !groupRef.current) return

    // Kepler sweep: dθ ∝ (1 + e·cosθ)² — fast at perihelion, lazy at apoapsis.
    // Hovering eases the moon to a near-halt so it's easy to click.
    const drag = hovered ? 0.06 : 1.0
    thetaRef.current += dt * moon.speed * drag * Math.pow(1 + moon.ecc * Math.cos(thetaRef.current), 2)

    const th = thetaRef.current
    const r  = (moon.a * (1 - moon.ecc * moon.ecc)) / (1 + moon.ecc * Math.cos(th))
    groupRef.current.position.set(Math.cos(th) * r, 0, Math.sin(th) * r)
  })

  return (
    <group ref={groupRef}>
      <animated.mesh
        scale={scale}
        onClick={e => { e.stopPropagation(); onClick() }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer" }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default" }}
      >
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.9 : isActive ? 0.6 : 0.38}
          roughness={0.18}
          metalness={0.4}
          clearcoat={0.6}
          transparent
          opacity={0.96}
        />
      </animated.mesh>

      {/* Soft halo so moons read as alive, not disabled */}
      <mesh>
        <sphereGeometry args={[0.56, 16, 16]} />
        <meshBasicMaterial
          color={color} transparent
          opacity={hovered ? 0.16 : isActive ? 0.12 : 0.07}
          side={THREE.BackSide} depthWrite={false}
        />
      </mesh>

      {visible && (
        <Html distanceFactor={12} center zIndexRange={[55, 45]} style={{ pointerEvents: "none" }}>
          <div style={{
            ...glassChip(color, hovered || isActive),
            padding: "3px 9px",
            color: hovered || isActive ? "#f8fafc" : "#cbd5e1",
            fontSize: "10px",
            fontFamily: "'DM Mono', monospace",
            whiteSpace: "nowrap",
            letterSpacing: "0.04em",
            transition: "color 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
            marginTop: "30px",
          }}>
            {moon.label}
          </div>
        </Html>
      )}
    </group>
  )
}

export function AboutSpokes({ centerPos, expanded, activeView, onSpokeClick }) {
  // Bloom spring — under-damped so the system blossoms out and settles
  // like masses finding their orbits.
  const { progress } = useSpring({
    progress: expanded ? 1 : 0,
    config: expanded
      ? { mass: 1.4, tension: 120, friction: 19 }   // bloom: gentle overshoot
      : { mass: 1, tension: 220, friction: 30 },     // collapse: clean pull-in
  })

  const pathOpacity = progress.to(p => p * 0.084)
  const bloomScale  = progress.to(p => Math.max(p, 0.0001))

  return (
    <animated.group position={[centerPos.x, centerPos.y, centerPos.z]} scale={bloomScale}>
      {MOONS.map(moon => (
        <group key={moon.id} rotation={[moon.incl, moon.yaw, 0]}>
          <OrbitPath a={moon.a} ecc={moon.ecc} opacity={pathOpacity} />
          <Moon
            moon={moon}
            progress={progress}
            isActive={activeView === moon.view}
            onClick={() => onSpokeClick(moon.view)}
          />
        </group>
      ))}
    </animated.group>
  )
}
