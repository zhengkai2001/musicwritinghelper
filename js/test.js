// Load VexTab module.
vextab = require("vextab");

VexTab = vextab.VexTab;
Artist = vextab.Artist;
Renderer = vextab.Vex.Flow.Renderer;

// Create VexFlow Renderer from canvas element with id #boo.
renderer = new Renderer($('#boo')[0], Renderer.Backends.CANVAS);

// For SVG, you can use the following line (make sure #boo is a div element)
// renderer = new Renderer($('#boo')[0], Renderer.Backends.SVG);

// Initialize VexTab artist and parser.
artist = new Artist(10, 10, 600, {scale: 0.8});
vextab = new VexTab(artist);

try {
    // Parse VexTab music notation passed in as a string.
    vextab.parse(
        "options space=20\
        tabstave\
        notation=true\
        key=A time=4/4\
        notes :q =|: (5/2.5/3.7/4) :8 7-5h6/3 ^3^ 5h6-7/5 ^3^ :q 7V/4 |\
        notes :8 t12p7/4 s5s3/4 :8 3s:16:5-7/5 :h p5/4\
        text :w, |#segno, ,|, :hd, , #tr\
        options space=25"
    );

    // Render notation onto canvas.
    artist.render(renderer);
} catch (e) {
    console.log(e);
}