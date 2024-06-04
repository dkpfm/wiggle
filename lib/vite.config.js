import { resolve } from "path";

export default {
  build: {
    lib: {
      entry: [
        resolve(__dirname, "src/index.js"),
        resolve(__dirname, "src/WiggleSpring.js"),
        resolve(__dirname, "src/WiggleRig.js"),
        resolve(__dirname, "src/WiggleRigHelper.js"),
      ],
      name: "Wiggle",
      fileName: (format, name) => {
        if (format === "es") {
          return `${name}.js`;
        }
        return `${name}.${format}`;
      },
    },
  },
};
