import { WiggleBone as WiggleSpring } from "./WiggleSpring";
import { WiggleBone } from ".";

class WiggleRig {
  constructor(skeleton, { multiplier = 1 } = {}) {
    this.wiggleBones = [];
    skeleton.bones.forEach((bone) => {
      if (bone.userData.wiggleVelocity) {
        this.wiggleBones.push(
          new WiggleBone(bone, {
            velocity: bone.userData.wiggleVelocity * multiplier,
          }),
        );
      } else if (bone.userData.wiggleStiffness) {
        this.wiggleBones.push(
          new WiggleSpring(bone, {
            stiffness: bone.userData.wiggleStiffness,
            damping: bone.userData.wiggleDamping,
          }),
        );
      }
    });
  }

  reset() {
    this.wiggleBones.forEach((wb) => wb.reset());
  }

  dispose() {
    this.wiggleBones.forEach((wb) => wb.dispose());
    this.wiggleBones = [];
  }

  update(dt) {
    if (!dt) {
      if (this.ms) {
        const ms = performance.now();
        dt = ms - this.ms;
        dt /= 1000;
        this.ms = ms;
      } else {
        this.ms = performance.now();
        dt = 16 / 1000;
      }
    }
    this.wiggleBones.forEach((bone) => bone.update(dt));
  }
}

export { WiggleRig };
