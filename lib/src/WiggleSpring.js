import {
  Vector3,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Quaternion,
} from "three";

import { Spring } from "./wobble";

const defaultOptions = {
  stiffness: 500,
  damping: 17,
};

const goalPosition = new Vector3();
const v1 = new Vector3();

const helper = new Mesh(
  new SphereGeometry(0.03),
  new MeshBasicMaterial({ transparent: true }),
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

    this._isFirstStep = true;

    const config = {
      stiffness: this.options.stiffness,
      damping: this.options.damping,
    };
    this.springX = new Spring({ fromValue: 0, toValue: 0, ...config });
    this.springY = new Spring({ fromValue: 0, toValue: 0, ...config });
    this.springZ = new Spring({ fromValue: 0, toValue: 0, ...config });

    this.originPosition = target.position.clone();
    this.originRotation = target.rotation.clone();
    this.oldBoneWorldPosition = new Vector3();
    this.oldBoneWorldRotation = new Quaternion();
    this.target.getWorldPosition(this.oldBoneWorldPosition);
    this.target.getWorldQuaternion(this.oldBoneWorldRotation);

    this.restLength = this.target.parent.position.length();
    this.reset();
  }

  reset() {
    this._isFirstStep = true;
    this.target.position.copy(this.originPosition);
    this.target.rotation.copy(this.originRotation);
    this.target.updateMatrixWorld(true, false);
    this.target.getWorldPosition(this.oldBoneWorldPosition);
  }

  dispose() {
    this.reset();
    const wrapper = this.target.parent;
    const parent = wrapper.parent;
    parent.remove(wrapper);
    parent.add(this.target);
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

    if (this._isFirstStep) {
      this._isFirstStep = false;
      this.springX.updateConfig({ fromValue: this.targetHelper.position.x });
      this.springY.updateConfig({ fromValue: this.targetHelper.position.y });
      this.springZ.updateConfig({ fromValue: this.targetHelper.position.z });
    }

    this.springX
      .updateConfig({ toValue: this.targetHelper.position.x })
      .start();
    this.springY
      .updateConfig({ toValue: this.targetHelper.position.y })
      .start();
    this.springZ
      .updateConfig({ toValue: this.targetHelper.position.z })
      .start();
    const ms = Date.now();
    this.springX._step(ms);
    this.springY._step(ms);
    this.springZ._step(ms);

    this.target.position.set(
      this.springX.currentValue,
      this.springY.currentValue,
      this.springZ.currentValue,
    );
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
    this.target.position.set(0, 0, 0);

    this.target.updateMatrix();
  }
}

export { WiggleBone };
