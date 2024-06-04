# Wiggle Bones for Three.js

Wiggle is a Three.js library that makes rigged objects move softly and feel alive.

→ [Read the full docs](https://wiggle.three.tools/)

### Setup

```
$ yarn add wiggle

# or

$ npm install --save wiggle
```


### Example

```js
import * as THREE from "three";
import { WiggleBone } from "wiggle";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

loader.load("/model.gltf", ({ scene }) => {
  const mesh = scene.getObjectByName("SkinnedMesh");
  let rootBone;
  const wiggleBones = [];

  mesh.skeleton.bones.forEach((bone) => {
    if (!bone.parent.isBone) {
      rootBone = bone;
    } else {
      const wiggleBone = WiggleBone(bone, {
        velocity: 0.5,
      });
      wiggleBones.push(wiggleBone);
    }
  });

  const tick = (ms) => {
    rootBone.position.x = Math.sin(ms);
    wiggleBones.forEach((wiggleBone) => {
      wiggleBone.update();
    });
    requestAnimationFrame(tick);
  };
  tick();
});
````
