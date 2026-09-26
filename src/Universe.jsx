import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { Scene } from "./Scene"

// Everything that pulls in three.js lives behind this module, which App
// loads with React.lazy — the mobile path (< 768px) never downloads it.
export default function Universe({ frameloop, onPointerMissed, ...sceneProps }) {
  return (
    <Canvas
      camera={{ position: [4, 14, 28], fov: 52 }}
      dpr={[1, 2]}
      frameloop={frameloop}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      onPointerMissed={onPointerMissed}
    >
      <Suspense fallback={null}>
        <Scene {...sceneProps} />
      </Suspense>
    </Canvas>
  )
}
