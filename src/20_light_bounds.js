// Three computes each finite point light's exact cutoff before shading it.
// Beyond that cutoff its colour is zero, so its diffuse/specular contribution
// is zero too. Skip the BRDF there while retaining the existing attenuation,
// shadows and full lighting inside every lantern/headlamp's influence.
(() => {
  const chunks = THREE.ShaderChunk, source = chunks.lights_fragment_begin;
  const start = source.indexOf('#if ( NUM_POINT_LIGHTS > 0 )');
  const end = source.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )', start);
  const call = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  const pointBlock = source.slice(start, end);
  if (start < 0 || end < 0 || !pointBlock.includes(call)) {
    LOG.warn('error', 'point-light-optimization-unavailable', { revision: THREE.REVISION });
    return;
  }
  chunks.lights_fragment_begin = source.slice(0, start)
    + pointBlock.replace(call, 'if ( directLight.visible ) { ' + call + ' }')
    + source.slice(end);
  LOG.info('business', 'bounded-point-light-shading-enabled', { revision: THREE.REVISION });
})();
