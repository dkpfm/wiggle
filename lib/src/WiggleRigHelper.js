import {
  PlaneGeometry,
  CylinderGeometry,
  Object3D,
  InstancedMesh,
  Vector3,
  Color,
  MeshBasicMaterial,
  ShaderLib,
} from "three";

const quad = new PlaneGeometry();
const cyl = new CylinderGeometry(1, 1, 1);
cyl.rotateX(Math.PI / 2);
const dummy = new Object3D();
const v1 = new Vector3();
const v2 = new Vector3();
const color = new Color("red");

class WiggleRigHelper extends Object3D {
  constructor({
    skeleton = null,
    dotSize = 0.33,
    lineWidth = 0.025,
    colorStatic = "#006CFF",
    colorDynamic = "#FC7229",
    extraBoneMultiplier = 1,
  } = {}) {
    super();

    if (!skeleton) {
      return console.log(
        "Failed to create WiggleRigHelper: missing skeleton on initialization",
      );
    }

    this.links = skeleton.bones.reduce((memo, bone) => {
      bone.children.forEach((child) => memo.push([bone, child]));
      return memo;
    }, []);

    this.finalBones = skeleton.bones.filter(
      (bone) => bone.children.length === 0,
    );
    this.finalBoneLengths = this.finalBones.map((bone) =>
      bone.position.length(),
    );
    this.finalBoneExtensionPositions = this.finalBones.map(() => new Vector3());

    // Dots
    this.dots = new InstancedMesh(
      quad,
      new WiggleBonesHelperDotMaterial({
        color: 0xffffff,
        transparent: true,
        depthTest: false,
      }),
      skeleton.bones.length + this.finalBoneLengths.length,
    );
    this.dots.renderOrder = 999;
    this.dots.frustumCulled = false;

    for (
      let index = 0;
      index < skeleton.bones.length + this.finalBones.length;
      index++
    ) {
      color.setStyle(index === 0 ? colorStatic : colorDynamic);
      // if (index >= skeleton.bones.length) color.setStyle("pink");
      this.dots.setColorAt(index, color);
    }

    this.add(this.dots);

    this.dots.onBeforeRender = (renderer, scene, camera) => {
      skeleton.bones.forEach((bone, i) => {
        const wP = bone.getWorldPosition(v1);
        dummy.position.copy(wP);
        dummy.scale.setScalar(dotSize);
        dummy.rotation.copy(camera.rotation);
        dummy.updateMatrix();
        this.dots.setMatrixAt(i, dummy.matrix);
      });
      this.finalBones.forEach((bone, i) => {
        v1.set(0, this.finalBoneLengths[0] * extraBoneMultiplier, 0);
        const wP = bone.localToWorld(v1);
        this.finalBoneExtensionPositions[i].copy(wP);
        dummy.position.copy(wP);
        dummy.scale.setScalar(dotSize);
        dummy.rotation.copy(camera.rotation);
        dummy.updateMatrix();
        this.dots.setMatrixAt(skeleton.bones.length + i, dummy.matrix);
      });
      this.dots.instanceMatrix.needsUpdate = true;
      this.dots.computeBoundingSphere();
    };

    // Lines
    this.lines = new InstancedMesh(
      cyl,
      new MeshBasicMaterial({
        color: colorDynamic,
        transparent: true,
        depthTest: false,
      }),
      this.links.length + this.finalBones.length,
    );
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (
      let index = 0;
      index < this.links.length + this.finalBones.length;
      index++
    ) {
      this.lines.setMatrixAt(index, dummy.matrix);
    }

    this.lines.renderOrder = 998;
    this.lines.frustumCulled = false;

    this.add(this.lines);

    this.lines.onBeforeRender = () => {
      this.links.forEach(([boneA, boneB], i) => {
        const wPA = boneA.getWorldPosition(v1);
        const wPB = boneB.getWorldPosition(v2);
        dummy.position.copy(wPA).lerp(wPB, 0.5);
        dummy.scale.set(lineWidth, lineWidth, wPA.distanceTo(wPB));
        dummy.lookAt(wPA);
        dummy.updateMatrix();
        this.lines.setMatrixAt(i, dummy.matrix);
      });
      this.finalBones.forEach((boneA, i) => {
        const wPA = boneA.getWorldPosition(v1);
        const wPB = this.finalBoneExtensionPositions[i];
        dummy.position.copy(wPA).lerp(wPB, 0.5);
        dummy.scale.set(lineWidth, lineWidth, wPA.distanceTo(wPB));
        dummy.lookAt(wPA);
        dummy.updateMatrix();
        this.lines.setMatrixAt(this.links.length + i, dummy.matrix);
      });
      this.lines.instanceMatrix.needsUpdate = true;
      this.lines.computeBoundingSphere();
    };
  }

  dispose() {
    // TODO
    super.dispose();
  }
}

export { WiggleRigHelper };

class WiggleBonesHelperDotMaterial extends MeshBasicMaterial {
  constructor(options) {
    super(options);

    this.uniforms = {
      ...ShaderLib.standard.uniforms,
    };
    this.type = "WiggleBonesHelperDotMaterial";

    this.vertexShader = /* glsl */ `
      #include <common>
      #include <batching_pars_vertex>
      #include <uv_pars_vertex>
      #include <envmap_pars_vertex>
      #include <color_pars_vertex>
      #include <fog_pars_vertex>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      #include <clipping_planes_pars_vertex>
      varying vec2 vvUv;
      void main() {
        #include <uv_vertex>
        #include <color_vertex>
        #include <morphcolor_vertex>
        #include <batching_vertex>
        #if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
          #include <beginnormal_vertex>
          #include <morphnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <defaultnormal_vertex>
        #endif
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        #include <clipping_planes_vertex>
        #include <worldpos_vertex>
        #include <envmap_vertex>
        #include <fog_vertex>

        vvUv = uv;
      }
    `;

    this.fragmentShader = /* glsl */ `
      uniform vec3 diffuse;
      uniform float opacity;
      #ifndef FLAT_SHADED
        varying vec3 vNormal;
      #endif
      #include <common>
      #include <dithering_pars_fragment>
      #include <color_pars_fragment>
      #include <uv_pars_fragment>
      #include <map_pars_fragment>
      #include <alphamap_pars_fragment>
      #include <alphatest_pars_fragment>
      #include <alphahash_pars_fragment>
      #include <aomap_pars_fragment>
      #include <lightmap_pars_fragment>
      #include <envmap_common_pars_fragment>
      #include <envmap_pars_fragment>
      #include <fog_pars_fragment>
      #include <specularmap_pars_fragment>
      #include <logdepthbuf_pars_fragment>
      #include <clipping_planes_pars_fragment>
      varying vec2 vvUv;
      void main() {
        vec4 diffuseColor = vec4( diffuse, opacity );
        #include <clipping_planes_fragment>
        #include <logdepthbuf_fragment>
        #include <map_fragment>
        #include <color_fragment>
        #include <alphamap_fragment>
        #include <alphatest_fragment>
        #include <alphahash_fragment>
        #include <specularmap_fragment>
        ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
        #ifdef USE_LIGHTMAP
          vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
          reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
        #else
          reflectedLight.indirectDiffuse += vec3( 1.0 );
        #endif
        #include <aomap_fragment>
        reflectedLight.indirectDiffuse *= diffuseColor.rgb;
        vec3 outgoingLight = reflectedLight.indirectDiffuse;
        #include <envmap_fragment>
        #include <opaque_fragment>

        float circ = length(vvUv - vec2(0.5)) * 1.5;
        gl_FragColor.a = smoothstep(0.5, 0.48, circ);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), smoothstep(0.35, 0.37, circ));
        gl_FragColor.rgb = mix(vec3(0.0), gl_FragColor.rgb, gl_FragColor.a);

        gl_FragColor.a += smoothstep(0.75, 0.5, circ) * 0.15;
        gl_FragColor.a = clamp(gl_FragColor.a, 0.0, 1.0);
        // gl_FragColor.a *= 0.9;


        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        #include <premultiplied_alpha_fragment>
        #include <dithering_fragment>
      }
    `;
  }
}
