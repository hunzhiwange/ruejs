async function runAndAttach(pkgPath) {
  const mod = await import(pkgPath)

  try {
    await mod.default()
  } catch (e) {
    const msg = String((e && e.message) || e)
    if (!msg.includes('Using exceptions for control flow')) {
      throw e
    }
  }
}

export async function vertexAnimation() {
  runAndAttach('./pkg/vertex-animation.js')
}

export async function tutorial1() {
  runAndAttach('./pkg/tutorial1-window.js')
}

export async function rueDesign() {
  runAndAttach('./pkg/@rue-js/design.js')
}

export async function ruedes() {
  runAndAttach('./pkg/ruedes.js')
}

export async function solarSystem() {
  runAndAttach('./pkg/solar-system.js')
}

export default vertexAnimation
