# Webapp
This project is created using [Vite](https://github.com/vitejs/vite).

## Running the app
```bash
$ npm i
$ npm start
```
## Architecture

The project is structured as a micro-kernel system, during boot the app initializes all modules to be used, differentianting from kernel modules and system modules. This type of architecture is common in operational system.

Kernel modules are any module that is not domain bounded, e.g. graphs modules, layout module, svg module, etc. Those are always booted first and all of them are loaded. A kernel module can't depend on a system module.

System modules are the ones that gives the context to the application. So the modules are usually related to the system domain and they consume the kernel to operate. System modules can also depends on each other.