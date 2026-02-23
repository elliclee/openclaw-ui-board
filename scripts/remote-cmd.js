const { executeCommand } = require('../server/ssh.js');
const { getConfig } = require('../server/config-manager.js');

async function main() {
    const args = process.argv.slice(2).join(' ');
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        console.log(`Executing: ${bin} ${args}`);
        const output = await executeCommand(`${bin} ${args}`);
        console.log("=== STDOUT ===");
        console.log(output);
    } catch (e) {
        console.error("=== ERROR/STDERR ===");
        console.error(e.message);
    }
    process.exit(0);
}

main();
