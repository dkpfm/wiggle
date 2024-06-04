import {
  Vector3,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Quaternion,
} from "three";

const defaultOptions = {
  velocity: 0.1,
  maxStretch: 0.1,
};

const goalPosition = new Vector3();
const v1 = new Vector3();

const helper = new Mesh(
  new SphereGeometry(0.03),
  new MeshBasicMaterial({ transparent: true })
);

class WiggleBone {
  constructor(target, options = {}) {
    this.options = { ...defaultOptions, ...options };
    const wrapper = target.clone();
    target.parent.add(wrapper);
    wrapper.add(target);
    this.target = target;
    this.targetHelper = helper.clone();
    if (options.scene) options.scene.add(this.targetHelper);
    this.currentHelper = helper.clone();
    if (options.scene) options.scene.add(this.currentHelper);
    this.currentHelper.add(helper.clone());
    this.currentHelper.children[0].position.y = -0.1;

    this.originPosition = target.position.clone();
    this.oldBoneWorldPosition = new Vector3();
    this.oldBoneWorldRotation = new Quaternion();
    this.target.getWorldPosition(this.oldBoneWorldPosition);
    this.target.getWorldQuaternion(this.oldBoneWorldRotation);

    this.restLength = this.target.parent.position.length();
  }
  reset() {
    this.target.position.copy(this.originPosition);
    this.target.updateMatrixWorld(true, false);
    this.target.getWorldPosition(this.oldBoneWorldPosition);
  }

  update(dt = null) {
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
    let times = 1;
    dt = Math.min(dt, 100);
    if (dt > 0.01) times = 2;
    if (dt >= 100) times = 25;
    if (dt < 0.006) return;

    for (let index = 0; index < times; index++) {
      this.step(0.0085 * 100);
    }
  }

  step(dt) {
    this.target.parent.updateMatrixWorld(true, false);

    this.targetHelper.position.copy(this.originPosition);
    this.target.parent.localToWorld(this.targetHelper.position);

    goalPosition
      .copy(this.oldBoneWorldPosition)
      .lerp(
        this.targetHelper.position,
        Math.min(this.options.velocity, 0.99999) * dt
      );

    this.target.position.copy(goalPosition);
    this.target.parent.worldToLocal(this.target.position);
    this.oldBoneWorldPosition.copy(goalPosition);

    const parentPosition = this.target.parent.getWorldPosition(v1);
    this.currentHelper.position.copy(goalPosition);
    this.currentHelper.updateMatrixWorld(true, false);

    this.currentHelper.lookAt(parentPosition);

    const unit = this.target.position.clone();
    unit.normalize();

    this.target.up.set(0, 1, 0);

    this.target.quaternion.setFromUnitVectors(this.target.up, unit);
    // const currlentL = Math.max(
    //   this.target.position.length(),
    //   this.options.maxStretch
    // );
    this.target.position.set(0, 0, 0);
    // this.target.parent.position.set(0, 0, 0);
    // this.target.position.setLength(currlentL);

    this.target.updateMatrix();
  }
}

export { WiggleBone };
