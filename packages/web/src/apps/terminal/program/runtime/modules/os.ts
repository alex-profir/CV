// `os` (009 contracts/node-api.md): fixed values that say browser where they can.
const GIB = 1_073_741_824;

export function createOs(uptime: () => number) {
  return {
    EOL: '\n',
    devNull: '/dev/null',
    platform: () => 'browser',
    type: () => 'Browser',
    release: () => '26.0.0',
    version: () => 'browser runtime',
    arch: () => 'browser',
    machine: () => 'browser',
    endianness: () => 'LE',
    homedir: () => '/home/guest',
    tmpdir: () => '/tmp',
    hostname: () => 'browser',
    cpus: () => [{ model: 'browser', speed: 0, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }],
    availableParallelism: () => 1,
    totalmem: () => GIB,
    freemem: () => GIB,
    loadavg: () => [0, 0, 0],
    uptime,
    networkInterfaces: () => ({}),
    userInfo: () => ({ uid: 1000, gid: 1000, username: 'guest', homedir: '/home/guest', shell: '/bin/bash' }),
  };
}
