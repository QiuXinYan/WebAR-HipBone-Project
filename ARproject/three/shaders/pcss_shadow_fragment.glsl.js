//https://developer.download.nvidia.com/shaderlibrary/docs/shadow_PCSS.pdf


const PCSS = /* glsl */`

  #define BLOCKER_SEARCH_NUM_SAMPLES 64  //64
  #define PCF_NUM_SAMPLES 64             //64;
  #define NEAR_PLANE  9.5                //0.05;
  #define NUM_RINGS 11
  #define LIGHT_WORLD_SIZE 0.005         //.5;
  #define LIGHT_FRUSTUM_WIDTH 3.75       //3.75; 
  #define LIGHT_SIZE (LIGHT_WORLD_SIZE / LIGHT_FRUSTUM_WIDTH)                //(LIGHT_WORLD_SIZE / LIGHT_FRUSTUM_WIDTH);
  
  const vec2 Poisson64[64] = vec2[](
    vec2(-0.934812, 0.366741),
    vec2(-0.918943, -0.0941496),
    vec2(-0.873226, 0.62389),
    vec2(-0.8352, 0.937803),
    vec2(-0.822138, -0.281655),
    vec2(-0.812983, 0.10416),
    vec2(-0.786126, -0.767632),
    vec2(-0.739494, -0.535813),
    vec2(-0.681692, 0.284707),
    vec2(-0.61742, -0.234535),
    vec2(-0.601184, 0.562426),
    vec2(-0.607105, 0.847591),
    vec2(-0.581835, -0.00485244),
    vec2(-0.554247, -0.771111),
    vec2(-0.483383, -0.976928),
    vec2(-0.476669, -0.395672),
    vec2(-0.439802, 0.362407),
    vec2(-0.409772, -0.175695),
    vec2(-0.367534, 0.102451),
    vec2(-0.35313, 0.58153),
    vec2(-0.341594, -0.737541),
    vec2(-0.275979, 0.981567),
    vec2(-0.230811, 0.305094),
    vec2(-0.221656, 0.751152),
    vec2(-0.214393, -0.0592364),
    vec2(-0.204932, -0.483566),
    vec2(-0.183569, -0.266274),
    vec2(-0.123936, -0.754448),
    vec2(-0.0859096, 0.118625),
    vec2(-0.0610675, 0.460555),
    vec2(-0.0234687, -0.962523),
    vec2(-0.00485244, -0.373394),
    vec2(0.0213324, 0.760247),
    vec2(0.0359813, -0.0834071),
    vec2(0.0877407, -0.730766),
    vec2(0.14597, 0.281045),
    vec2(0.18186, -0.529649),
    vec2(0.188208, -0.289529),
    vec2(0.212928, 0.063509),
    vec2(0.23661, 0.566027),
    vec2(0.266579, 0.867061),
    vec2(0.320597, -0.883358),
    vec2(0.353557, 0.322733),
    vec2(0.404157, -0.651479),
    vec2(0.410443, -0.413068),
    vec2(0.413556, 0.123325),
    vec2(0.46556, -0.176183),
    vec2(0.49266, 0.55388),
    vec2(0.506333, 0.876888),
    vec2(0.535875, -0.885556),
    vec2(0.615894, 0.0703452),
    vec2(0.637135, -0.637623),
    vec2(0.677236, -0.174291),
    vec2(0.67626, 0.7116),
    vec2(0.686331, -0.389935),
    vec2(0.691031, 0.330729),
    vec2(0.715629, 0.999939),
    vec2(0.8493, -0.0485549),
    vec2(0.863582, -0.85229),
    vec2(0.890622, 0.850581),
    vec2(0.898068, 0.633778),
    vec2(0.92053, -0.355693),
    vec2(0.933348, -0.62981),
    vec2(0.95294, 0.156896));

  
  float PenumbraSize(float zReceiver, float zBlocker) //Parallel plane estimation
  {
      return (zReceiver - zBlocker) / zBlocker;
  } 
  
  //return average blocker depth 
  void FindBlocker(
          sampler2D shadowMap,
          out float avgBlockerDepth,
          out int numBlockers,
          vec2      uv,
          float     bias,
          float     zReceiver) 
  {
      float blockerSum = 0.0;
      float searchWidth = float(LIGHT_SIZE) * (float(zReceiver) - float(NEAR_PLANE)) / float(zReceiver);
      for(int i = 0; i < BLOCKER_SEARCH_NUM_SAMPLES; i++) {
          vec2 offset = Poisson64[i];
          float sampleDepth = unpackRGBAToDepth(texture2D(shadowMap, uv + offset * searchWidth));
          if(sampleDepth < (zReceiver - bias)) {
              blockerSum += sampleDepth;
              numBlockers++;
          }
      }
      avgBlockerDepth = blockerSum / float(numBlockers);
  }
  
  float PCF_Filter(
        sampler2D shadowMap,
        vec2  uv,
        float zReceiver,
        float bias,   //avoid
        float filter_radius) 
  {
    float sum = 0.0;
    for(int i = 0; i < PCF_NUM_SAMPLES; i++) {
        vec2 offset = Poisson64[i] * filter_radius;
        float sampleDepth = unpackRGBAToDepth(texture2D(shadowMap, uv + offset));
        if( (zReceiver - bias) <= sampleDepth )
            sum += 1.0;
    }
    return sum / float(PCF_NUM_SAMPLES);
  }
  
  //sampler2D shadowMap, vec4 coords 
  float PCSS(sampler2D shadowMap, vec2 uv, float bias, float zReceiver) {
      //TODO
      // STEP 1: blocker search
      float avgBlockerDepth = 0.0;
      int numBlockers = 0;
      FindBlocker(shadowMap, avgBlockerDepth, numBlockers, uv, bias, zReceiver);
  
      //There are no occluders so early out (this saves filtering) 
      if(numBlockers == 0) {
          return 1.0;
      }
      // STEP 2: penumbra size 
       float penumbraRatio = PenumbraSize(zReceiver, avgBlockerDepth);
       float filterRadiusUV = penumbraRatio * LIGHT_SIZE * NEAR_PLANE / zReceiver;
       
      // STEP 3: filtering
      return PCF_Filter(shadowMap, uv, zReceiver, bias ,filterRadiusUV);
  }
  
  //transform 
  float ShadowCalculation(sampler2D shadowMap, vec4 coords )
  {
      float bias = 0.05;
      vec2 uv = coords.xy;
      float currentDepth = coords.z;
      return PCSS(shadowMap, uv, bias, currentDepth);
  }
`


const getshadow = /* glsl */`
    return ShadowCalculation(shadowMap, shadowCoord);
`;


let shader = THREE.ShaderChunk.shadowmap_pars_fragment;

    shader = shader.replace(
      '#ifdef USE_SHADOWMAP',
      '#ifdef USE_SHADOWMAP' + PCSS 
    );

    shader = shader.replace(
      '#if defined( SHADOWMAP_TYPE_PCF )',
       getshadow +
      '#if defined( SHADOWMAP_TYPE_PCF )'
    );


THREE.ShaderChunk.shadowmap_pars_fragment = shader;
