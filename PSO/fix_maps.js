const fs = require('fs');

function fixTeleporters(filename) {
    if (!fs.existsSync(filename)) return;
    let data = JSON.parse(fs.readFileSync(filename, 'utf8'));

    // Find the first room
    let room1 = data.rooms[0];
    if (room1 && data.teleporters) {
        data.teleporters.forEach(t => {
            if (t.type === 'town') {
                // Move 3 tiles outside room 1's entrance.
                // Assuming Room 1 starts at x:4, y:4
                t.x = room1.x - 3;
                t.y = room1.y + 1; // y:5
                
                // Set the floor to 1 for the teleporter
                data.grid[t.y][t.x] = 1;
                
                // Create a corridor connecting it to the room
                data.grid[t.y][t.x + 1] = 1;
                data.grid[t.y][t.x + 2] = 1;
                // Also ensure the room edge itself is floor (it should be)
                data.grid[t.y][room1.x] = 1;
                
                // Also update the map start position so the player spawns there
                data.start = { x: t.x, y: t.y };
            }
            if (t.type === 'next') {
                // Just make sure the tile under it is a floor
                if (data.grid[t.y] && data.grid[t.y][t.x] !== undefined) {
                    data.grid[t.y][t.x] = 1;
                }
            }
        });
    }

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Updated ${filename}`);
}

fixTeleporters('forest1_1.json');
fixTeleporters('forest2_1.json');
