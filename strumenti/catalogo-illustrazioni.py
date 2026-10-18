#!/usr/bin/env python3
"""Prepare individual catalogue artwork jobs and index completed local pictures.

Read-only inputs: SEED_OGGETTI, SEED_PIATTI and SEED_INGREDIENTI in the atelier.
This script never generates pictures, uploads anything or changes catalogue data.
Run without arguments to refresh prompts/jobs; use --build to also publish the
local picture index. Only real 512 × 512 WebP files are included in that index.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEEDS = (
    ("SEED_OGGETTI", "oggetto", 114),
    ("SEED_PIATTI", "piatto", 25),
    ("SEED_INGREDIENTI", "ingrediente", 346),
)


def visual_map(text: str) -> dict[str, str]:
    result = {}
    for line in text.strip().splitlines():
        name, depiction = line.split("\t", 1)
        if name in result:
            raise ValueError(f"Duplicate visual brief: {name}")
        result[name] = depiction
    return result


# Artistic choices describe appearance only; none introduces rules, prices,
# abilities, mechanical upgrades or additional canonical lore.
OBJECT_VISUALS = visual_map("""
Bussola artigianale	A handmade round ship compass, aged brass rim, glass face, red-and-white magnetic needle, dark wooden housing and tiny steel fasteners.
Log Pose artigianale	A handmade wrist-mounted nautical Log Pose: a single upright delicate magnetic needle floating inside a clear spherical glass dome, brass base and stitched brown leather wrist strap; not a flat compass.
Carta nautica aggiornata	A single partly unrolled ivory nautical chart, simple coast shapes, one clear coloured sailing route and a small wooden measuring divider; absolutely no written words or numbers.
Carta nautica dettagliata	A large carefully folded nautical chart with intricate island coastlines, coloured currents, depth shading and a brass drafting compass; all chart marks abstract, no readable text.
Eternal Pose artigianale	An ornate single-needle Eternal Pose in a precise glass sphere over an engraved silver-and-gold base, warm leather strap, one needle pointing steadily toward an abstract island silhouette; no words.
Binocolo semplice	Simple twin wooden binocular tubes with dark leather grips, two clear glass lenses and a short joining bridge.
Binocolo rinforzato	Sturdy twin binoculars with riveted metal barrel armour, padded leather grips, large blue-tinted optics and precision screws.
Telescopio da torre	A long polished brass lookout telescope tilted on a tall three-legged shipboard stand, large blue objective lens and stout mounting fittings.
Strumento di triangolazione	A compact brass surveyor's sight with pivoting arms, a glass sighting lens, an unlettered graduated arc and a dangling plumb bob.
Lanterna segnaletica	A ship signal lantern with coloured glass panes, brass shutters, visible oil reservoir and curved internal reflector, a restrained warm flame.
Kit pesca avanzato	A neatly grouped fishing kit: short wooden rod, spool of line, hooks, lead sinkers and colourful cork floats; no fish or cooked food.
Trappola per volatili	An empty compact wooden bird trap with a raised slatted cage, fine rope trigger and a tiny bait cup; no trapped animal.
Filtro acqua artigianale	A handmade water filter with stacked transparent sections of cloth, sand and dark charcoal above a small clean-water jar.
Zattera di emergenza	A small emergency raft of lashed seasoned logs and empty barrels, coiled ropes and folded waterproof canvas, viewed as a complete miniature object.
Kit segnalamento marino	Three unlit nautical signal rockets grouped with their short launching tube, brass wire fittings and a corked pouch of luminous powder.
Kit medico base	An open simple leather medical roll containing clean bandages, small scissors, herb sachets and two corked remedy bottles.
Kit medico avanzato	A broad open reinforced medical case with orderly steel instruments, sterile bandage rolls, glass vials and padded compartments.
Antidoto universale (kit)	An open antidote kit with several tiny differently coloured glass vials, a dropper and a folded cloth in a leather-lined wooden case.
Bende rinforzate (scorta)	A stock of thick clean woven bandage rolls, one partly unrolled to reveal its reinforced layered fabric.
Vaporizzatore termale	A small copper-and-brass medical steam vessel with glass water chamber, curved nozzle and a gentle plume of clean steam.
Chiavi e attrezzi da lavoro	A tidy grouped set of weathered iron spanners, adjustable wrench, pliers and wooden-handled screwdriver.
Kit riparazione avanzato	An open rugged repair box with precision tools, spare screws, rivets and small mechanical parts in fitted trays.
Officina portatile	A compact folding portable workbench with miniature vice, hand tools and a fitted wooden carrying case beneath it.
Pompa di sentina migliorata	A sturdy brass-and-iron hand bilge pump with piston handle, copper pipe and a short flexible rubber hose.
Barometro artigianale	A handmade round brass barometer in a wooden mount, clear glass dial and an unlettered pointer scale.
Stazione meteorologica	A compact ship weather station combining brass barometer, tiny cup anemometer and glass humidity tube on a wooden support; no lettering.
Aquilone atmosferico	A fabric weather kite with light wooden cross-frame, a small hanging measurement capsule and a neatly coiled tether.
Tenda impermeabile da coperta	A small fully pitched waterproof canvas deck tent with taut ropes, sturdy pegs and a rolled doorway, isolated complete object.
Tamburo di segnalazione	A barrel-shaped nautical signal drum with stretched pale hide, rope tensioning and a pair of wooden drumsticks.
Sistema di bandiere (set completo)	A neatly arranged set of small colourful nautical signal flags on short spars, simple geometric patterns and coiled halyard rope; no letters.
Lumacofono	A canonical One Piece Den Den Mushi telephone snail: squat yellow-beige soft foot, tall upright face, two thick eye stalks with drooping white eyes and small black pupils, large expressive talking mouth with thick pink lips and square teeth. Large green shell with a bold dark spiral, modest dark telephone receiver in a cream cradle, simple side rotary dial and short curled cord. Keep the polished colourful anime catalogue finish; no purple baby-snail anatomy, kawaii irises, ornate brass bells, leather bib, chest harness or anchor emblems.
Megafono artigianale	A handmade flared copper megaphone with wooden grip, riveted seams and a simple mechanical mouthpiece.
Tonico ricostituente	A squat corked amber medicine bottle containing warm golden tonic, beside a small bundle of ordinary medicinal leaves; no label.
Tonico del chirurgo	A slender clear surgical tonic bottle filled with ruby liquid, a clean metal dosing spoon and a neat white cloth; no label.
Siero di vita	An elegant rounded glass serum flask with luminous coral-pink liquid, fine silver stopper and subtle bright highlights; no magical symbols or label.
Iniezione d'emergenza	A sturdy emergency medical syringe with clear barrel, bright red fluid, protected needle and a compact padded carrying cradle.
Sali energetici	A shallow open tin of vivid pale citrus-coloured mineral crystals beside its plain lid and a tiny measuring scoop.
Decotto del marinaio	A thick glass bottle of deep herbal-green decoction, cork stopper, loose dried maritime herbs tied around the neck; no label.
Elisir di vigore	A broad-shouldered glass elixir flask containing rich orange liquid, dark leather neck wrap and tightly fitted cork.
Antidoto comune	A small clear corked antidote vial of pale jade liquid, paired with a simple glass dropper and a few plain leaves.
Antidoto del Grand Line	A carefully sealed dark turquoise antidote bottle with thick protective glass, a brass stopper and a rare-looking botanical sprig; no writing.
Coagulante rapido	A compact apothecary jar of dark red coagulant powder, plain wax seal, tiny wooden spatula and folded gauze.
Collirio di menta	A small clear eye-drop bottle containing pale mint-green fluid, rounded dropper tip and two fresh mint leaves.
Sali di risveglio	A tiny hinged brass smelling-salts container opened to reveal coarse white crystals, with a small folded cloth.
Febbrifugo	A short brown medicine bottle containing cool blue-green fever remedy, plain cork and a small dose cup.
Pillole di guaranà	A tiny open wooden pill box holding several round reddish-brown guarana tablets, beside a split red guarana berry.
Soluzione lucidità	A slim hexagonal glass flask of clear pale blue solution with a precise glass stopper and restrained clean highlights.
Iniezione d'adrenalina	A slim metal-and-glass injection syringe containing bright amber fluid, long plunger and capped needle, laid diagonally.
Stimolante da battaglia	A robust dark glass stimulant bottle with deep crimson contents, protective leather lattice and plain metal screw stopper.
Anestetico locale	A small squat cobalt glass anaesthetic bottle beside a plain cotton pad and a clean glass dropper.
Calmante	A rounded corked medicine bottle containing soft violet liquid, with a simple chamomile-like sprig beside it.
Sedativo del cacciatore	A narrow dark green sedative vial in a weathered leather pouch, thin dropper and folded stopper cloth; no weapon.
La Palla Tonante	One small amber-gold spherical medicinal pill with a subtle textured surface, resting in a simple open wooden pill case; not a bomb, ball weapon or lightning spell.
Kit da estrazione veleni	A compact venom extraction kit with empty glass collection vials, forceps, fine tubing and a small hand bulb on a leather roll.
Laboratorio tossicologico	A miniature portable toxicology bench with small glass retort, sample rack, mortar and protected reagent bottles, no written labels.
Veleno paralizzante	A narrow corked glass vial filled with electric violet venom, leather grip band and plain wax seal; no skull graphic.
Veleno necrotico	A thick dark bottle holding deep plum-black venom with a faint green surface sheen, plain stopper and sturdy glass walls.
Gas soporifero	A sealed small pressure canister with brass valve and viewing window showing pale lavender vapour; no escaped gas or people.
Antidoto maestro	An ornate clear pear-shaped antidote flask of bright emerald liquid, careful brass neck fittings and a precise dropper.
Tossina debilitante	A short angular glass vial holding murky olive toxin, dark cork and a simple protective leather sleeve.
Distilleria portatile	A compact transportable copper still with boiler pot, coiled condenser, clear collection flask and folded carrying handles.
Bomba incendiaria	One sealed round ceramic incendiary bomb with a short unlit wick, dark metal collar and red-orange lacquered shell; no explosion or diagram.
Fiala acida	A thick green-tinted sealed acid vial with protective metal cage and plain ceramic stopper; no spill, recipe or labels.
Bomba fumogena	One squat blue-grey smoke bomb with ribbed casing, short unlit fuse and a flat heavy base; no smoke cloud obscuring silhouette.
Carica esplosiva	One compact wrapped explosive charge with plain red paper casing, short unlit fuse and coarse cord binding; no instructions or cutaway.
Granata accecante	One polished brass flash grenade with rounded body, protected safety lever and crisp light-catching facets; no detonation.
Kit da scavo	A grouped archaeology digging kit with short spade, trowel, soft brush and a rolled cloth tool wrap.
Calchi da iscrizione (kit)	A plaster-and-wax inscription casting kit with a shallow mould, pale plaster fragment bearing abstract grooves, wax pieces and a small soft brush; not paper rubbings or readable text.
Taccuino delle rovine	A worn leather field notebook partly open to abstract ruin sketches, a charcoal pencil and a small bookmark; no readable words.
Lente del filologo	An elegant large brass magnifying lens with carved dark wooden handle, blue glass reflections and a small protective sleeve.
Compendio delle leggende	A thick weathered green-and-brown leather reference volume with brass corner guards and page ribbons; blank unlettered cover.
Strumento da taverna	A simple well-used wooden concertina with red leather bellows, rounded brass fittings and a few plain buttons; no performer.
Strumento di liuteria	A finely crafted wooden mandolin with warm honey-coloured body, clean strings, elegant sound hole and polished bridge; no performer.
Strumento del maestro	An elaborate polished violin with rich red-brown wood, fine gold fittings and a curved bow beside it; no performer.
Proiettili a punta d'acciaio	A small orderly group of compact ammunition rounds with pointed silver steel tips and brass casings, isolated inert objects.
Bombe fumogene	A pair of compact round grey smoke bombs, wrapped handles and short unlit fuses, distinct paired ammunition stock.
Granate a mano	A small pair of inert hand grenades with dark olive segmented casings, safety levers and simple metal pull rings.
Dardi sedativi	Three small feathered darts with narrow metal tips and tiny translucent blue reservoirs, resting together; no target.
Proiettili incendiari	A grouped set of inert brass ammunition rounds with red-painted tips and dark bands; no firing, flames or explanatory cutaway.
Dardi a rete	Two thick compact net darts with visibly folded mesh bundled behind their blunt heads and short stabilising fins.
Proiettili a frammentazione	A small orderly group of inert rounds with dark segmented metal heads and brass bases; no explosion or internal diagram.
Cariche a scoppio ritardato	Two compact inert charge packs with visible small brass clockwork housings and short unlit cords; no numerals or construction diagram.
Proiettili perforanti pesanti	Three oversized heavy inert ammunition rounds with long dark steel points and thick brass casings, strong substantial silhouette.
Proiettili d'agalmatolite	A few inert ammunition rounds with pale blue-grey stone tips and dark brass casings; stone surface matte and mineral, no invented magical glow.
Piede di porco meccanico	A rugged mechanical crowbar with broad forked steel tip, riveted leverage hinge and dark wrapped handgrip.
Rampino a scatto	A compact spring-loaded grappling hook with four folded steel claws partly deployed, leather grip and neatly coiled rope.
Rete a scatto	A compact folded capture net held in a small spring-release frame, strong mesh and brass trigger fittings; no trapped creature.
Maschera filtrante	A weathered leather respirator mask with round dark glass lenses and two small metal filter cartridges, empty wearable object.
Guanti da presa	A pair of thick leather climbing gloves with textured palms, reinforced metal finger pads and adjustable wrist straps; no hands inside.
Grimaldelli a ingranaggi	A tidy leather roll containing slender mechanical lockpicks with tiny gear-shaped handles and precision metal tips.
Verricello portatile	A compact hand winch with side crank, steel drum, wound rope and sturdy curved hook on a portable bracket.
Scarpe a molla	A matching pair of leather boots with visibly compressed metal heel springs and reinforced soles, no wearer.
Ali planate pieghevoli	A compact foldable canvas glider wing assembly, bamboo ribs, brass hinge joints and leather harness, wings partly spread.
Braccio meccanico ausiliario	An articulated auxiliary brass-and-steel mechanical arm with three pivot joints, mounting bracket and useful three-finger gripper; no body.
Lama a scatto	A single compact spring blade mechanism with polished short steel blade extended from a leather-and-brass handle.
Bastone telescopico	A segmented telescoping metal staff shown partly extended, nested cylindrical sections and leather-wrapped central grip.
Guanto d'arme rinforzato	One empty reinforced steel combat gauntlet with layered knuckle plates, brass rivets and a thick leather wrist cuff.
Pistola a più canne	A compact original pirate multi-barrel pistol with several short brass-and-steel barrels and a polished wooden grip, inert display.
Arpione a cavo	A sturdy compact harpoon launcher with steel harpoon head, wound retrieval cable spool and wooden grip, inert display.
Mazza a contrappeso	A heavy mechanical mace with broad iron head, visible sliding counterweight and a short leather-wrapped haft.
Balestra a ripetizione	A pirate mechanical repeating crossbow with wooden stock, compact upper bolt magazine and brass ratchet details; no operator.
Fucile a canna lunga	A long elegant pirate rifle with walnut stock, slender steel barrel, brass fittings and a simple optical sight, inert display.
Lame gemelle bilanciate	Two matching balanced curved steel blades arranged symmetrically, mirrored brass guards and dark leather-wrapped handles.
Cannone da spalla	A short chunky shoulder-mounted cannon with broad steel barrel, padded leather shoulder support and brass fittings, no wearer.
Gru da carico	A compact ship cargo crane with wooden boom, brass pulley, suspended empty hook and a small sturdy mounting base.
Fondo scorrevole	A small ship-compartment cutaway showing a wooden false floor sliding on metal guides to expose an empty hidden storage space; no text or arrows.
Argano d'arrembaggio	A heavy ship boarding winch with broad wooden drum, thick rope, iron gear crank and large grappling hook.
Paratie stagne migliorate	A standalone reinforced watertight ship bulkhead section with a sealed rectangular door, thick metal rim and wheel latch.
Timone ausiliario	A compact auxiliary wooden ship rudder with strong metal stock, spare steering bar and simple mounting hinges.
Lanciarpioni di bordo	A deck-mounted harpoon launcher with large steel bolt, winding cable reel and rotating iron base, no ship scenery.
Rostro rinforzato	A standalone reinforced ship-bow ram, heavy tapered iron prow over a small curved wooden bow section, riveted metal plates.
Batteria a ripetizione	A compact deck artillery battery with several short barrels on a single sturdy carriage and brass rotating feed mechanism; no firing.
Ponte corazzato	A small isolated cross-section of a ship deck showing timber beams beneath overlapping riveted iron armour plates, no explanatory text.
Scafo a doppio fasciame	A small isolated curved ship-hull cross-section revealing two distinct layers of wooden planking and strong ribs, no labels or arrows.
""")

DISH_VISUALS = visual_map("""
Arrosto del Capitano	A generous cooked roast joint with browned crust, glossy juices and roasted potato pieces on a rustic oval serving platter.
Stufato di battaglia	A deep rustic bowl of cooked beef stew, chunky tender meat, carrots and potatoes in rich dark broth, small clean steam curls.
Costolette alla brace	A plated rack of cooked grilled ribs with char lines, shiny glaze and a few herb leaves on a dark rustic plate.
Spiedini misti	A small platter of cooked skewers alternating browned meat pieces, peppers and onions, colourful appetising charred surfaces.
Carne secca da traversata	Several finished dried jerky strips arranged on a simple wooden serving board, dark reddish-brown fibrous texture and a small cloth wrap.
Zuppa di mare imperiale	A generous deep bowl of cooked seafood soup with swordfish pieces, giant prawns, seaweed and aromatic herbs in bright golden broth.
Sashimi del New World	An artfully plated ready-to-eat sashimi assortment of translucent unusual deep-sea fish slices, pale garnishes and a tiny green condiment mound.
Fritto di calamaro gigante	A heaped plate of cooked golden battered giant squid rings and curled tentacle pieces, crisp texture and a lemon wedge.
Carpaccio di pesce volante	A wide plate of ready-to-eat thin translucent flying-fish carpaccio slices arranged in a fan, citrus and delicate herbs.
Pesce alla griglia	One fully cooked grilled fish with crisp golden skin and visible grill marks, served with a lemon wedge and herbs on an oval plate.
Curry di verdure	A rustic bowl of cooked golden vegetable curry with potato, onion and colourful root vegetable chunks in rich sauce.
Vellutata di funghi marini	A shallow bowl of smooth creamy cooked marine mushroom soup, a few sliced mushroom caps and a small cream swirl.
Minestrone del Grandline	A deep bowl of cooked minestrone containing bright seasonal vegetables and beans in a reddish broth, gentle steam.
Insalata esotica	A fresh ready-to-eat salad of unusually shaped leafy greens, edible blossoms and seeds in a broad simple bowl.
Macedonia tropicale	A bowl of prepared tropical fruit salad with cut pineapple, mango, papaya and coconut pieces, vivid juicy surfaces.
Succo energetico	A tall clear glass of freshly blended vivid orange tropical juice, small fruit wedge at its rim and no packaging or label.
Marmellata artigianale	A finished artisan fruit preserve in an open squat glass jar with bright berry jam, a serving spoon and a small plain saucer.
Torta del Capitano	An appetising finished small layered cake on a simple cake plate, cream filling, caramel glaze and a few fresh fruit pieces, no candles or writing.
Budino del Grand Line	A finished rounded fluted custard pudding on a white saucer, rich amber caramel glaze and a small vanilla pod garnish.
Pasticcini alla marmellata	A small plate of golden baked shortcrust pastries with bright red jam centres, flaky edges and a light sugar dusting.
Biscotti da traversata	A finished pile of sturdy golden ship biscuits, crisp uneven edges and tiny baked holes, presented with a folded cloth.
Zuppa del Guerriero	A deep rustic bowl of hearty cooked meat soup with large meat and root-vegetable chunks in rich broth.
Ramen del porto	A steaming cooked ramen bowl with springy noodles, clear rich broth, sliced meat, egg halves and chopped scallions, chopsticks resting beside it.
Brodo di ossa lunghe	A bowl of finished clear golden long-bone broth with a small aromatic herb garnish and spoon, no raw bones floating in it.
Brodo veloce da razioni	A simple tin camp mug of finished hot broth with a few softened ration pieces and a plain wooden spoon.
""")

MATERIAL_VISUALS = visual_map("""
Sabbia	A small loose mound of pale golden sand with a few distinct tiny grains and one simple canvas scoop.
Segatura	A small fluffy pile of fresh honey-coloured sawdust, fine wood curls and a plain open cloth pouch.
Picchetti	A tidy bundle of pointed wooden pegs of different lengths tied with coarse twine.
Gesso	Several chalky white gypsum chunks and a small mound of pale plaster powder in a plain shallow bowl.
Legno	Three ordinary rough-cut brown timber pieces with visible end grain and a small strip of bark.
Colla	An open plain ceramic glue pot filled with thick amber adhesive, lid and a short wooden applicator.
Legno cavo	Two hollow wooden poles cut to expose their open central channels and natural ringed grain.
Legno leggero	A neat small bundle of pale thin lightweight timber slats with delicate porous end grain.
Viti	A small grouped pile of ordinary steel screws with threaded shafts and simple slotted heads.
Rivetti	A small orderly group of stubby round-headed copper and iron rivets, one lying on its side.
Catrame	A small open metal pail of shiny black tar, a short stirring stick and a thick dark surface ripple.
Pece	Several solid irregular glossy dark pitch lumps beside a plain shallow pot with a partly softened lump.
Bulloni	Several large steel bolts with hexagonal heads, matching nuts and washers grouped together.
Legno duro	Two dense dark hardwood blocks with tight rich grain and crisp freshly sawn edges.
Chiodatura	A small bundle of strong iron shipbuilding nails, one wide flat nail head prominent in front.
Guarnizioni	A group of dark rubber and leather sealing gaskets, circular rings and one flat rectangular seal.
Legno di rinforzo	Two thick squared reinforcing timber pieces with visibly sturdy straight grain and metal-free clean ends.
Tavole di ricambio	A neat short stack of ordinary ship replacement planks with gently weathered surfaces and squared ends.
Legno massello	One substantial solid timber block with uninterrupted dark grain and a clean broad end face.
Traverse	Three stout wooden crossbeams stacked at right angles, square profiles and visible end-grain rings.
Legno stagionato	A small stack of seasoned dry timber with warm muted colour, a few natural drying lines and straight grain.
Viti di precisione	Several tiny polished precision screws arranged neatly beside a small plain compartment tray.
Guide scorrevoli	A pair of nested steel sliding rails, one partly extended to reveal its smooth guide channel.
Chiavistelli nascosti	Two compact concealed iron sliding latches with low-profile mounting plates and recessed mechanisms.
Rinforzi interni	A small grouped set of curved wooden braces and plain iron internal reinforcement brackets.
Piastre di ferro	Three thick dark iron plates stacked slightly offset, rough hammered surfaces and squared corners.
Portelli a tenuta	A standalone rectangular sealed hatch with thick timber panel, iron rim and compression wheel latch.
Legno pregiato	Several polished reddish-brown fine timber boards with beautiful flowing grain and rich lustre.
Rivestimento in ferro	A few broad thin curved iron sheathing panels with rows of plain rivets.
Rinforzi di chiglia	Two thick curved keel reinforcement ribs with stout wooden profiles and dark iron joint brackets.
Fasciame doppio	A compact construction material sample showing two offset overlapping layers of curved wooden hull planks.
Rame per il sottoscafo	A short stack of gently curved reddish copper hull sheets with small fastening holes and a few green patina marks.
Legno stagionato in quantità	A substantial orderly bound bundle of many seasoned timber boards, more numerous than a small ordinary wood stack.
Pesi	A small group of plain iron calibration weights of different compact cylindrical shapes, no numbers.
Piombi	Several small dull grey fishing sinkers with eyelets, grouped with a short loose line.
Piombo	Two dull bluish-grey soft lead ingots with slight dents and thick rounded edges.
Ferro	Two rough dark grey iron bars with a small irregular ore-like fragment, matte slightly weathered surfaces.
Metallo	A generic mixed stock of grey metal bar, small sheet and short rod, unmarked and uncoloured.
Pesi di piombo	Three chunky dull grey lead weights with simple loop handles and visibly heavy compact forms.
Anima di piombo	A single long dense grey lead core rod with rounded ends and a short cross-section piece beside it.
Canna	A short hollow metal tube used as a fabrication component, plain cylindrical walls and open ends, no complete weapon.
Ghisa	Two dark rough cast-iron billets with grainy moulded surfaces and a small square casting beside them.
Tubo di gomma	A coiled thick black rubber hose with both open circular ends visible and one plain brass coupling.
Fili di ottone	A small spool of thin golden brass wire with several graceful loose wire lengths.
Metallo o cuoio rigido	Two alternative rigid fabrication samples grouped as a thin dark metal plate and a firm brown leather panel, no written or symbolic separator.
Aste metalliche	A tidy bundle of long straight steel rods with circular ends, tied with a simple cord.
Ottone	Two warm yellow brass bars and a small shiny brass sheet, clean metallic highlights.
Testa di ghisa	A standalone heavy cast-iron striking head with a central empty handle socket, rough dark surface.
Acciaio	Three cool silver steel bars with polished edges and crisp bright reflections.
Tubo di rame	One curved reddish copper pipe segment with open ends and a small simple elbow bend.
Acciaio sottile	A few very thin flexible silver steel strips, one slightly curled to show its light gauge.
Ghisa scanalata	A thick dark cast-iron piece with clearly visible evenly spaced longitudinal grooves.
Metallo pesante	A broad squat dark dense metal ingot with thick beveled edges and a substantial weighty silhouette.
Tubi di rame	A grouped set of three reddish copper pipe lengths and an elbow fitting, varying diameters.
Magnesio	A few small pale silvery magnesium strips and shavings in a plain closed-edge metal sample dish, no ignition.
Metallo fine	Small slender polished metal strips and delicate fine rods grouped on a tiny plain tray.
Acciaio elastico	A gently bowed thin steel strip and one compact spiral of spring steel, clean flexible metal surfaces.
Tubi d'acciaio a sezioni	Several nested hollow steel tube sections of decreasing diameter, one partly extended.
Canne d'acciaio	A pair of long hollow steel barrel tubes with thick circular openings, unfinished fabrication components.
Mantice	A closed wooden-and-leather bellows with two handles and a narrow brass nozzle.
Acciaio leggero	A few slim pale steel members with hollow profiles and thin silver sheet, airy practical construction stock.
Canna corta d'acciaio	A single short stout hollow steel barrel component with a broad open bore and plain mounting collar.
Mercurio (o alcool)	Two alternative sealed laboratory sample ampoules: one with a silver metallic droplet, one with clear liquid; both safely closed, no text.
Nucleo denso	One compact dark dense cylindrical metal core with smooth ends and a strongly weighted silhouette.
Acciaio temprato	A short dark tempered-steel bar and blade-shaped blank with cool blue edge highlights, unfinished raw stock.
Metallo di precisione	A few precisely machined polished metal blocks and rods with clean holes and extremely crisp aligned edges.
Ferro magnetico raffinato	A refined dark iron bar with a small magnetic needle resting toward it, subtle metallic highlights and no supernatural aura.
Canna rigata	A standalone steel barrel tube angled so its open mouth shows shallow internal spiral rifling, no complete weapon or cutaway diagram.
Incudine	A small worn blacksmith's iron anvil with tapered horn, broad flat top and sturdy foot.
Acciaio pregiato	Two lustrous premium silver steel ingots with immaculate beveled edges and fine reflective grain.
Fornace	A compact standalone brick-and-iron forge furnace with small warmly glowing opening, stout chimney and closed side door.
Oro/argento	A paired gold ingot and silver ingot, each polished with simple beveled edges and no stamped markings.
Minerale magnetico raro	An unusual dark magnetite-like crystalline ore cluster with iron-grey facets and a few tiny nearby iron filings; no invented magic symbols.
Molla	One large clean steel coil spring standing slightly diagonally, clear repeating spiral silhouette.
Molle	Several steel springs of different lengths and diameters neatly grouped, no mechanism attached.
Snodo	One sturdy brass-and-steel articulated universal joint with a central pivot and two open mounting ends.
Contrappesi	Two heavy iron counterweights with simple hanging loops and short linked mounting rods.
Fermi a molla	A few compact spring catches with metal tongues, small visible coils and simple mounting plates.
Telaio in bambù	A light small rectangular bamboo framework with diagonal crossbrace and twine-bound joints.
Carrucole	Three wooden-and-brass pulley blocks with grooved wheels and short looped rope sections.
Molla a scatto	One compact cocked snap-spring component with a sharply bent steel strip and small catch, no complete trap.
Snodi	Several small articulated metal hinge joints, one elbow-shaped and one ball pivot, arranged as loose parts.
Treppiede	A compact folded brass-and-wood tripod partly opened with three clearly distinct legs and a flat mounting head.
Cricchetto	One compact exposed brass ratchet wheel and pawl assembly with a short hand lever.
Telaio	A sturdy rectangular plain timber-and-metal structural frame with open centre and visible corner joints.
Carrelli	Two small rolling carriage components with paired metal wheels and simple flat mounting platforms.
Contrappeso mobile	A dense rectangular iron sliding counterweight on a short metal guide rail, shown midway along its travel.
Staffe d'acciaio	A grouped set of strong L-shaped and U-shaped steel brackets with plain drilled mounting holes.
Base girevole	A standalone round metal rotating base plate over a short stout pedestal, visible layered bearing ring.
Ingranaggi	A small overlapping group of brass and dark steel cogwheels with crisp teeth and central holes.
Valvole	Three compact brass control valves with simple wheel handles, short pipe sockets and polished fittings.
Argano a mano	A small hand-operated winch with crank handle, exposed drum and a short coil of rope.
Meccanismo a molla	A compact loose spring mechanism with broad steel coil, brass gear and simple trigger housing, no tool attached.
Serbatoio d'acqua	A small sealed riveted metal water tank with rounded corners, filling cap and a short lower tap.
Argani	A grouped pair of heavy rope winch drums with iron frames and plain crank fittings.
Molle temprate	Several stout dark tempered-steel springs with subtle blue heat-treatment sheen and strong close coils.
Munizioniera	An open plain wooden ammunition storage box with fitted empty compartments and dark metal corner bands.
Telaio leggero	A thin open lightweight metal-and-wood frame with slender struts and small reinforced corner joints.
Ammortizzatori	A pair of compact piston-and-coil shock absorbers with metal mounting eyelets.
Cremagliere	Two straight toothed steel rack bars and one small matching pinion, loose fabrication pieces.
Ventola d'estrazione	A small brass extraction fan with curved blades, protective circular wire guard and short duct collar.
Affusto	A standalone small wooden wheeled gun carriage with iron bands and empty barrel cradle, no cannon attached.
Pistoni	Two loose polished steel piston assemblies with cylindrical heads and connecting rods.
Serpentina di raffreddamento	A long copper cooling tube wound into a compact open spiral with two clear pipe ends.
Caricatore a gravità	An empty metal gravity-feed hopper component with broad upper opening and narrow lower feed neck.
Meccanismo a percussione	A compact inert brass-and-steel percussion firing mechanism component with small hammer and spring, no ammunition or diagram.
Affusto a spalla	An empty padded leather shoulder gun cradle on a short metal frame, no weapon or person.
Argano rinforzato	A heavy reinforced steel winch component with wide drum, thick brackets and substantial hand crank.
Tamburo rotante	A cylindrical rotating metal feed drum with evenly spaced empty chambers and a stout central axle.
Affusti a ritorno	Two compact artillery recoil carriages with sturdy wooden beds, steel runners and visible return springs, no barrels.
Ingranaggi di precisione	A meticulously arranged small set of fine brass microgears, slim axles and one tiny toothed wheel.
Meccanismo di precisione	A small open brass precision assembly with delicate interlocking gears, tiny screws and a fitted mounting plate.
Congegno a orologeria	A compact exposed clockwork mechanism with brass gears, wound spring and balance wheel, no numbered clock face.
Ago	A single long steel sewing needle with a clearly visible eye and a short loop of plain thread.
Filo	A small wooden spool of plain fine thread with one loose trailing strand.
Contenitore	One simple empty lidded metal storage vessel with a broad opening and no markings.
Filo resistente	A wooden spool of thick dark reinforced thread with a visibly braided loose strand.
Involucro	A simple empty flexible folded wrapping pouch, plain waxed surface and rolled open mouth.
Bacchette	Several slim straight wooden sticks bundled neatly with a small piece of twine.
Corde fini	Two small neatly coiled fine cords with delicate twisted fibres and loose tapered ends.
Involucro di carta oleata	A folded empty waxed-paper wrapper with soft ivory translucent folds and simple twine tie.
Contenitori	A small group of empty plain storage pots of different sizes with matching lids and practical handles.
Imbottitura	A folded pale fabric pad with one edge revealing soft fluffy fibre filling.
Impugnatura	One standalone carved wooden tool grip with an empty metal tang socket and simple ergonomic curve.
Astuccio	A small open fitted leather case with empty padded interior, simple clasp and stitched seams.
Filo a piombo	A brass conical plumb bob hanging from a partly wound fine cord spool.
Uncini	Several curved iron hooks of assorted sizes with small eyelets and clean pointed ends.
Barilotti vuoti	Two small empty wooden barrels, one open to reveal its clean hollow interior and separate lid.
Bracciale di cuoio	A broad empty brown leather wrist cuff with simple brass buckle and visible hand stitching.
Contenitore di vetro	An empty clear wide-neck glass vessel with a plain cork lying beside it.
Lima	A worn rectangular steel hand file with fine ridged surface and smooth wooden handle.
Manico di legno duro	A standalone dense dark hardwood tool handle with polished grain and a plain drilled mounting end.
Setacci	Two round wooden sieves with different fine metal mesh, nested loosely together.
Corde di tensione	A pair of taut-ready braided cord loops with simple metal tensioning hooks, coiled for storage.
Filo d'innesco	A small spool of inert fuse cord with a short loose end, no flame or explosive attached.
Impugnatura di cuoio	A standalone dark leather-wrapped grip with tightly wound overlapping strips and a simple metal endcap.
Martelli	Two ordinary shipwright's hammers with wooden handles, one flat steel head and one small cross-peen head.
Cinghiaggio	A grouped set of broad brown leather straps with brass buckles, one neatly rolled and one loosely folded.
Involucro metallico	An empty two-piece cylindrical metal casing with a detached cap and visible hollow interior.
Aghi cavi	A small orderly set of hollow medical needles with plain metal hubs and protective empty storage tube.
Ganci da nave	Two large heavy curved ship hooks with stout iron shafts and loop mounting ends.
Imbracatura	An empty sturdy brown leather safety harness with joined straps, brass buckles and a central metal attachment ring.
Stampo	A plain open two-part metal casting mould showing one simple empty rounded cavity; no instructions or labels.
Ago magnetico	A delicate red-and-white magnetic compass needle resting on a tiny brass pivot, no complete compass case.
Attrezzi in ferro	A small grouped set of simple iron pliers, punch, chisel and spanner with worn wooden grips.
Involucro di rame	An empty reddish copper shell with curved thin walls, detached cap and clear hollow opening.
Lame fini	Three narrow unmounted precision steel blades with bright thin edges and plain fastening holes.
Ago sensibile	An extra-slender balanced magnetic needle on a fine jewelled pivot, tiny protective glass tube beside it, no complete Log Pose.
Calcio di noce	A standalone polished walnut rifle stock blank with rich brown grain and an empty fitting recess, no barrel.
Attrezzi in acciaio	A clean small set of silver steel pliers, fine chisel and screwdriver with practical dark handles.
Incastonatura	A small empty ornate brass-and-silver setting with delicate retaining prongs and an open central recess, no gemstone.
Strumenti di misura	A grouped brass caliper, plain ruler with unnumbered tick marks and a folding divider, no text.
Contenitore a pressione	One small sealed riveted pressure vessel with thick metal walls, brass safety valve and plain gauge without numerals.
Due else speculari	A pair of exactly mirrored curved sword guards in polished brass, unmounted and symmetrically arranged.
Bende	Two ordinary clean cotton bandage rolls, one loose edge showing soft woven texture.
Cotone	A small fluffy pile of raw white cotton fibre beside one opened cotton boll.
Corda	One ordinary medium-thick tan rope coil with clear twisted strands and a loose end.
Olio	A plain corked clear bottle of golden cooking oil with a tiny pourer and restrained glossy reflections; culinary ingredient, not a finished dish.
Tessuto	A folded length of plain undyed woven fabric with a loose slightly frayed corner.
Cera	Several pale yellow wax blocks and a small rounded wax lump with smooth matte surfaces, no candle flame.
Corde	Several separate coils of ordinary tan rope in different practical lengths, distinct from a single coil.
Tessuto leggero	A loosely folded light airy cream fabric with translucent thin edges and gentle flowing folds.
Corda intrecciata	One tight broad braided cord coil with a clearly interwoven multistrand pattern.
Bende sterili	Two bright white neatly wrapped sterile bandage rolls in plain clean paper sleeves, one sleeve partly open.
Corda cerata	One compact coil of dark tan waxed rope with smooth slightly glossy twisted fibres.
Tessuto colorato	A small folded stack of vivid red, blue and yellow woven fabric swatches, clean saturated colours.
Cuoio	A rolled medium-brown leather sheet with warm grain texture and one unfolded curved corner.
Corda nautica	One heavy salt-weathered ship rope coil with thick pale twisted fibres and a large secure loop.
Resina naturale	Several translucent amber natural resin pieces beside a small bark fragment, raw organic glossy material.
Tessuto cerato	A folded mustard-brown waxed fabric sheet with visible weave and a slightly glossy water-resistant surface.
Vernici	Three small open plain paint pots showing red, ochre and deep blue pigment, no brushes painting a scene.
Cavo	A neatly coiled flexible tensile steel cable used for a harpoon tether. Clearly visible tightly braided silver steel wire strands, rope-like twist and fine metallic texture. One end has a solid crimped closed eye loop fitting and the other has a solid capped swaged metal end. This is a load-bearing metal wire rope, NOT a hose, NOT a pipe, not hollow. Both ends are solid or closed eye-loops; there must be no open circular tube ends.
Guanti spessi	A pair of empty thick tan work gloves with sturdy seams and reinforced palms.
Olio infiammabile	A sealed dark brown oil bottle with a plain metal cap and amber liquid visible through a narrow clear strip; no flames.
Cavi	A small grouped set of dark cable coils with different thicknesses and simple metal couplings.
Cuoio imbottito	A folded brown padded leather panel with a stitched quilted surface and a soft thick cut edge.
Pelle tesa	A circular frame holding tightly stretched pale rawhide with laced edges, unmounted material rather than a complete drum.
Resina adesiva	A small open earthenware pot of thick amber adhesive resin with a sticky strand on a short wooden applicator.
Cuoio spesso	A thick dark brown leather slab partly rolled to expose its heavy layered edge and rugged surface.
Vernice impermeabile	A small open plain metal tin of clear amber waterproof varnish, lid and a short unused brush beside it.
Tessuto impermeabile	A folded dense blue-grey waterproof fabric sheet with a few clean water beads on its smooth surface.
Rete di canapa cerata	A folded coarse square-mesh waxed hemp net with tan knots and a short rope border.
Tela impermeabile	A tightly rolled heavy greenish waterproof canvas with a partly unfurled thick edge and simple tie.
Cavi di rinvio	Two neatly looped steel control cables with small eyelet ends and compact guide pulleys beside them.
Cavo d'acciaio	One coil of bare silver braided steel cable with bright wire texture and a robust looped end.
Esca	A tiny plain open bait tin containing small worms and simple fish scraps, fishing material, no cooked dish or gore.
Ami	A small group of steel fishing hooks in several sizes with clear barbs and tiny eyelets.
Piume di stabilizzazione	A neat group of narrow brown and white flight feathers trimmed as dart fletching, no whole animal.
Galleggianti	Three colourful cork fishing floats with thin stems and tiny line eyelets, bright red, cream and green paint.
Arpioni ripiegabili	Two loose collapsible steel harpoon heads with hinged barbs, one folded and one partly opened.
Barra di riserva	One sturdy spare wooden steering bar with dark iron mounting socket and smooth worn handgrip.
Arpione d'acciaio	One long steel harpoon with pointed barbed head and short dark wooden shaft, no launcher.
Rampini pesanti	A pair of large heavy iron grappling hooks with stout curved claws and thick attachment eyes.
Passerelle rinforzate	Two short reinforced wooden gangplank sections with cross slats, iron side bands and practical hooks.
Arpione pesante	One especially thick heavy barbed iron harpoon, broad triangular head and robust shaft, no launcher.
Vetro	Several clear ordinary glass pieces and a plain small glass pane, clean safe finished edges.
Fiale di vetro	Three empty slender clear glass sample vials, one with its plain cork beside it.
Vetro colorato	A small fan of ruby, emerald and blue glass panes with translucent coloured reflections.
Scala graduata	One plain curved brass measuring scale with fine unnumbered tick marks, no letters or digits.
Vetro soffiato	An empty hand-blown clear glass sphere with short neck, delicate irregularities and a loose cork.
Scale graduate	A small grouped set of straight and curved measurement plates with unnumbered tick marks, no writing.
Vetro spesso	Two thick clear glass slabs with broad polished edges and strong blue-green refraction.
Vetreria	A small set of empty laboratory glassware: round flask, retort and short sample tube, no liquid or label.
Specchio riflettente	A small oval mirror in a simple brass rim, clear pale reflection and polished curved backplate.
Vetro di precisione	Two perfectly clear fitted glass domes with crisp polished rims and fine controlled reflections.
Igrometro	A small brass hygrometer with glass-fronted round face, delicate pointer and simple unnumbered scale.
Anemometro	A compact three-cup brass wind meter mounted on a short vertical steel shaft, isolated instrument.
Vetro ottico	A pair of thick polished optical glass blanks with clear pale blue refraction and flawless smooth surfaces.
Barometro	A round brass pressure instrument with glass cover, dark pointer and plain unnumbered face, no wooden casing.
Strumenti di triangolazione	A grouped brass sighting compass, pivoting survey arm and small tripod head, all without written markings.
Mirino ottico	One compact brass-and-steel optical sight tube with clear blue lens, adjustment knob and simple mounting rings.
Lenti ottiche di qualità	Three fine polished optical lenses of varied curves, clear bright refractions and a simple protective padded tray.
Carbone	A small mound of irregular matte black coal pieces with sharp crumbly edges, no fire.
Miccia	A loose coil of thick unlit fuse cord with a frayed end and ordinary woven outer sheath.
Miccia corta	One short unlit fuse cord segment with visibly frayed tips, laid beside a tiny plain tie.
Polvere	A small mound of generic fine pale grey powder in a plain shallow dish, no explosion or invented chemical identity.
Alcool	A plain sealed clear glass bottle of transparent alcohol with a simple cork and small dose cup, no flame.
Zolfo	Several bright yellow sulphur mineral chunks beside a small mound of yellow powder, no reaction.
Salnitro	A small mound of white crystalline saltpetre in a plain ceramic dish beside a closed sample jar, no reaction.
Innesco	A single compact inert brass primer component with simple cap and small connector, no attached explosive or assembly diagram.
Sali minerali	A small group of white and pale rose mineral crystals in a simple shallow wooden scoop.
Reagenti base	Three small plain corked reagent bottles with clear, pale amber and pale blue liquids, no labels or recipe.
Solvente	A small sealed clear laboratory bottle of colourless solvent with a tight plain glass stopper.
Alcool puro	A tall immaculate sealed laboratory bottle of perfectly clear pure alcohol with precise glass stopper, no label.
Fornelletto	A small portable brass laboratory burner with closed fuel vessel, short pot supports and a tiny contained blue flame.
Polvere da sparo	A small sealed plain dark powder tin beside a tiny shallow sample dish of coarse black gunpowder, no flame or instructions.
Solventi	A grouped set of three plain sealed glass solvent bottles of differing shapes, all clear liquids and no labels.
Acidi blandi	Two small thick-walled sealed acid sample bottles containing pale green and colourless liquids, no spill or symbols.
Carbone attivo	A plain open jar of small porous matte black activated-charcoal granules with a tiny wooden scoop.
Polveri fumogene	A small set of closed plain powder tins with separate grey, blue-grey and white sample heaps, no released smoke or recipe.
Reagenti	A compact wooden sample rack holding several plain corked reagent vials with varied subdued liquid colours, no writing.
Polvere lampo	A small closed plain metal flash-powder container beside a tiny pale silver powder sample, no ignition or glare effect.
Polvere raffinata	A plain sealed dark sample tin with a very fine smooth grey powder mound beside it, no reaction.
Sali corrosivi	A tightly sealed thick glass sample jar containing sharp pale greenish-white crystals, no damage effects or warning typography.
Solvente volatile	A small tightly stoppered slim glass flask holding clear liquid, protective leather base sleeve, no fumes or flame.
Acidi distillati	Two carefully sealed thick clear laboratory flasks containing pale yellow-green liquid, polished glass stoppers, no spill.
Polvere luminescente	A tiny plain open glass sample jar holding softly glowing turquoise powder, a few loose grains immediately beside it, restrained local glow.
Alambicco da campo	A compact field copper retort still with foldable base, short condenser tube and empty collection flask.
Polvere ad alta carica	A sturdy closed dark iron powder canister with heavy plain lid, a tiny coarse black sample beside it, no detonation or instructions.
Distillatore	A standalone tall copper distilling vessel with narrow neck, cooling coil and small clear collection bottle.
Alambicco	A traditional rounded copper alembic pot with curved swan-neck tube and a small plain receiving flask.
Polvere esplosiva raffinata	A reinforced closed plain brass sample pot and tiny very fine dark powder sample on a shallow dish, no reaction or recipe.
Banco da veleni	A small isolated wooden toxicology workbench with empty vial rack, mortar and sealed dark bottles, no labels or diagrams.
Erbe medicali base	A modest raw bundle of ordinary green medicinal leaves and small dried stems tied with simple twine.
Miele	An unlabelled squat glass honey jar with viscous golden honey, wooden dipper and a small honeycomb piece; raw pantry ingredient.
Erbe amare	A small raw bundle of jagged dark green bitter herb leaves with a few thin woody stems.
Erbe medicinali	Several distinct raw medicinal herb sprigs, green serrated leaves and tiny pale blossoms, bundled in cloth.
Propoli	A few dark amber-brown raw propolis pieces with sticky uneven resinous surfaces in a small wooden dish.
Erbe antisettiche	A raw bundle of crisp silver-green medicinal herb sprigs with small clean pointed leaves.
Funghi medicinali	Three raw small medicinal mushrooms with varied russet caps, pale stems and one thick shelf-like fungus piece.
Sedativo	A small plain corked apothecary bottle containing muted lavender sedative extract, isolated preparation ingredient rather than a complete kit.
Erbe termali	A raw cluster of sturdy rounded green thermal-spring herb leaves with a few fresh moisture beads and short stems.
Funghi sedativi	A raw cluster of small muted violet-brown sedative mushrooms with rounded caps and slender pale stems.
Anestetico	A small plain sealed dark blue apothecary bottle of clear anaesthetic preparation, no syringe or medical kit.
Antibiotici	A small plain open medicine tin with a few simple pale tablets and one unmarked sealed vial, no packaging text.
Strumenti chirurgici	A tidy set of clean steel surgical scissors, forceps and small scalpel on a folded white cloth, no procedure or person.
Traccia di veleno di creatura	One tiny sealed sample vial with only a small dark violet venom droplet at the bottom, extremely limited quantity.
Erbe rare	A raw bundle of unusual broad silver-veined leaves and delicate crimson-tipped stems, botanical specimen without magic aura.
Estratti di piante rare	Three small sealed clear vials of green and amber plant extracts with a few unusual botanical leaves beside them.
Veleno di creatura	One tightly corked glass collection vial containing dark purple creature venom, no creature, gore or invented species.
Inchiostro	An open small dark ink bottle with glossy black ink and a plain quill resting beside it, no writing.
Carta oleata	A folded stack of translucent cream waxed-paper sheets with soft slightly glossy edges.
Carta di qualità	A neat stack of smooth clean ivory paper sheets with crisp edges, no text, drawings or symbols.
Inchiostri multipli	Several small open glass inkwells showing blue, red, green and black inks, plain stoppers beside them.
Pergamena di qualità	A partly unfurled clean ivory parchment scroll with even surface, plain wooden rollers and blank unmarked area.
Microfono	A small original brass shipboard microphone with rounded grille, short stand and a coiled dark cord, no logo.
Altoparlanti	A pair of compact wood-and-brass loudspeaker cabinets with visible round cloth-covered cones and simple fittings.
Pergamena pregiata	A luxurious pale warm parchment scroll with fine clean edges and polished dark wooden rollers, entirely blank.
Lumaca	A single lively non-humanoid communication snail with expressive eye stalks, natural curled pastel shell and no telephone receiver attached.
Erba leggendaria	One striking raw botanical specimen with large pale silver-veined green leaves and a single unusual deep blue blossom, no magical symbol.
Erbe leggendarie	A small varied collection of rare-looking raw botanical sprigs with silver veins and jewel-coloured blossoms, distinct grouped specimens.
Estratto di pianta abissale	A tiny sealed dark glass extract flask with deep blue-green liquid and one unusual dark marine botanical frond beside it.
Ricerca narrativa	An illustrative symbolic research bundle: a closed weathered field notebook, blank parchment, magnifying glass and one neutral stone specimen; abstract reference entry, not a purchasable physical resource or invented game item.
Scaglie d'agalmatolite	A small cluster of matte blue-grey sea-stone flakes with pale mineral strata and sharp chipped edges, no glow or powers illustrated.
Veleno di creatura abissale	A small heavily sealed thick glass specimen vial of very dark indigo venom, copper stopper and protective wrap, no creature or gore.
Carne rossa pregiata	An uncooked thick fine red steak with delicate pale marbling on a simple butcher's board, raw culinary ingredient, no cooked sides or gore.
Carne di selvaggina	Several uncooked dark red game-meat cuts with lean grain on a small plain butcher's board, no animal carcass or gore.
Costolette	An uncooked rack of fresh pink-red ribs with pale clean bones and a narrow fat edge, raw ingredient, no grill marks or sauce.
Carne mista	A small grouped assortment of uncooked red and pale meat cubes on a plain board, raw ingredient, no skewers or cooked dish.
Carne salata e stagionata	A cured salted meat slab with crystalline salt crust and a few uncooked cured slices, pantry ingredient rather than plated jerky meal.
Ossa di carne	A few clean uncooked stock bones with small pale-red meat traces, no gore, served as raw broth ingredients on a plain board.
Ossa di selvaggina	Several long clean uncooked game-stock bones with knobby joints and tiny dark meat remnants, no carcass or gore.
Pesce spada	One fresh raw silver-blue swordfish with unmistakable long pointed bill, plus one neat raw steak beside it, no blood or cooked dish.
Gamberi giganti	A pair of oversized fresh raw prawns with blue-grey shells, long curved antennae and clear segmented tails, no sauce or cooking.
Pesce abissale raro	One unusual fresh raw deep-sea fish with dark blue scales, luminous-looking natural eye and broad fins, no prepared meal or gore.
Calamaro del Grand Line	One fresh raw oversized squid with pale purple mantle, clear long tentacles and rounded eyes, no batter, plate or cooking.
Pesce volante fresco	One fresh raw blue-silver flying fish with long spread wing-like pectoral fins, clean scales, no garnish or prepared slices.
Pesce comune	Two small fresh raw ordinary silver fish with intact fins and clear eyes, no prepared meal or gore.
Alghe rare	A raw bundle of unusual purple and emerald seaweed fronds with delicate branching forms and a few moisture beads, no cooking.
Patate	Three unpeeled raw potatoes with warm brown skins, one small cut section revealing pale yellow flesh, no cooked dish.
Cipolla	One raw golden onion and a clean half onion showing pale concentric rings, loose papery skin, no prepared meal.
Cipollotto	A small bundle of fresh raw scallions with long bright green stalks, pale bulbs and fine roots.
Verdure grigliate	A small ingredient portion of pre-grilled pepper, courgette and aubergine pieces with char marks in a plain ingredient tray; not a composed finished meal.
Verdure di radice	A raw mixed cluster of carrot, turnip and small root vegetables with soil-free skins and a few intact leafy tops.
Funghi sottomarini	A raw cluster of unusual soft blue-green underwater mushrooms with rounded caps and translucent pale stems, no cooked soup.
Verdure miste di stagione	A raw seasonal vegetable grouping with carrot, leafy cabbage, small tomato and squash pieces, no composed salad or cooking.
Legumi	A small open cloth pouch spilling raw dry beans, chickpeas and lentils, varied natural colours.
Foglie rare	A few raw unusual broad edible leaves with intricate silver-green veins and one gently curled edge, no magical symbols.
Fiori commestibili	A small loose grouping of fresh edible blossoms in purple, yellow and white, delicate petals and short green stems.
Semi	A small open plain paper packet spilling mixed edible seeds in brown, cream and black, no writing.
Aglio	One whole raw garlic bulb with two loose unpeeled cloves and a single clean peeled clove.
Cocco	One whole brown coconut beside a cut half exposing bright white flesh and clear coconut water, raw fruit.
Limone	One fresh bright yellow lemon with a cut half showing juicy pale flesh and one green leaf.
Frutta tropicale mista	A raw unprepared grouping of small pineapple, mango, papaya and coconut, whole fruits with one clean cut half, not a fruit-salad bowl.
Frutta rara	A small grouping of unusual natural-looking tropical fruits with vivid magenta, amber and teal skins, no Devil Fruit spiral patterns or supernatural effects.
Frutta di stagione	A raw grouping of ordinary fresh apples, pears and small berries in a modest wicker ingredient basket, not a prepared dessert.
Frutto esotico	One distinctive raw exotic fruit with bright orange-red ridged skin and a green leaf crown, one clean cut wedge; no Devil Fruit spirals or magic.
Razioni secche	A small raw pantry ration bundle of plain hardtack, dried grains and dried fruit pieces in a folded cloth, no cooked meal.
Farina	A small open rough cloth flour sack with a mound of fine off-white flour and a wooden scoop.
Farina pregiata	A small neatly opened fine cloth flour pouch holding silky bright ivory flour, one polished wooden measuring scoop, distinct premium pantry presentation.
Panna	A small plain ceramic jug of fresh thick white cream with a tiny glossy cream swirl at the lip, ingredient rather than dessert.
Noce moscata	Three whole brown nutmegs with textured shells, one split to show mottled interior and a tiny plain grater.
Zucchero di canna	A small open dish of coarse warm brown cane-sugar crystals beside a short piece of sugarcane.
Zucchero raro	A small plain glass jar of unusually large translucent pale amber sugar crystals, no magical glow or labelled provenance.
Crema	A small plain ingredient bowl of thick pale yellow pastry cream, simple spoon with one soft ribbon of cream, no finished pastry.
Uova	Three fresh uncooked eggs with pale cream shells in a simple small straw nest, one whole darker shell egg.
Caramello	A small plain ingredient pitcher of glossy amber caramel with a thick ribbon on a spoon, no finished pudding.
Pasta frolla	A raw pale buttery shortcrust dough ball with one rolled sheet and a light flour dusting, no baked biscuits.
Marmellata artigianale	An unlabelled sealed pantry jar of ruby fruit jam with a plain cloth-covered lid and two fresh berries beside it; cooking ingredient, not a plated dessert.
Zucchero	A plain open cloth pouch spilling fine white sugar crystals, a few small white sugar cubes beside it.
Burro	A fresh pale yellow butter block partly wrapped in plain cream paper with one clean slice cut off, no writing.
Vaniglia	Three long dark vanilla pods, one slit open to show tiny black seeds, tied loosely with plain string.
Brodo	A plain lidded storage jar of clear golden stock with a small ingredient ladle beside it, cooking ingredient, no served soup bowl.
Brodo di carne	A plain storage crock holding rich dark amber meat stock, closed lid beside it and a small ladle, no finished meal or raw meat garnish.
Noodles	A dry uncooked nest of pale wheat noodles with a few straight strands beside it, no soup bowl, chopsticks or cooked toppings.
Acqua	A clear unlabelled glass water bottle with a plain cork and a few clean water droplets, cooking ingredient.
Erbe	A small raw culinary herb bundle of green parsley-like leaves and thin aromatic sprigs, loosely tied with twine.
Sale marino	A shallow small wooden dish of coarse white sea-salt crystals beside a tiny plain scoop.
Spezie esotiche	A raw spice grouping of colourful unusual dried pods, star-shaped spice and bright powders in tiny plain wooden dishes, no prepared meal.
Salsa	A small plain cooking sauce jug containing rich reddish-brown sauce, ingredient serving vessel, no finished dish.
Wasabi	A raw green wasabi root with knobbly skin, one tiny mound of fresh green paste and a simple small grater.
Salsa di soia	A small plain dark glass soy-sauce bottle with a cork, a tiny dipping dish of deep brown sauce beside it, no label.
Spezie	A modest raw spice grouping of peppercorns, cinnamon stick and warm brown ground spice in a shallow wooden scoop.
Spezie del Sud	A raw warm-coloured spice assortment of dried red chillies, reddish powder and aromatic brown seeds, no invented regional emblem.
Menta	A small fresh raw mint sprig bundle with bright serrated green leaves and clear leaf veins.
Sciroppo	A plain clear corked pantry bottle of thick amber syrup with a tiny metal pouring spout, no label or prepared drink.
Erbe toniche	A raw bundle of crisp tonic herb sprigs with long green leaves and small red berries, no potion bottle or magical effect.
Spezie forti	A raw fiery spice grouping of dried red chilli peppers, dark peppercorns and vivid red powder in a tiny plain dish.
Carne di Bananawani	An uncooked thick reptilian meat cut with pale pink flesh and a small band of green pebbled skin, on a plain butcher's board; no whole creature, gore or cooked dish.
Carne di Sea King	An uncooked huge-looking deep-red sea-creature steak with broad pale marbling and a small blue-green scaly skin edge; clean ingredient portion, no creature, gore or cooked dish.
Carne di Laboon	An uncooked dark ruby whale-meat portion with a pale fat edge and smooth dark outer skin strip, on a simple ingredient board; no whole character, gore or prepared meal.
Pesce Volante del Nord	One fresh raw silver flying fish with cool navy upper scales, long icy-blue wing-like fins and crisp pale belly, no cooked meal.
Calamaro del Profondo	One fresh raw deep-indigo squid with broad mantle, long curled pale-tipped tentacles and large natural eyes, no soup or cooked dish.
Alga Poneglyph	A raw cluster of dark blue-green ancient-looking marine algae with broad angular veined fronds; no stone tablet, written glyphs, invented language or magical effect.
Fungo marino luminoso	A raw small marine mushroom cluster with translucent turquoise caps emitting a restrained natural local glow and pale moist stems, no prepared soup.
Frutto Knock Cola	A whole raw cola-like tropical fruit with dark reddish-brown ridged shell, a green leaf and one clean cut wedge with amber flesh; no drink bottle, Devil Fruit spirals or powers.
""")

STYLE = (
    "Create one original square pirate-adventure anime inventory illustration. "
    "Colourful polished cel shading, confident hand-drawn outlines, crisp readable "
    "silhouette, expressive material textures, clean high-quality game item art. "
    "Match the warm detailed brass/wood/leather finish and line quality of the "
    "approved handmade compass catalogue reference; use the subject's own "
    "appropriate natural colours rather than tinting every object gold. "
    "Single coherent isolated subject or the small set explicitly described, "
    "fully visible, centred, generous clear breathing room, three-quarter view "
    "unless the subject needs another view for recognition. "
    "512 × 512 final square artwork, transparent background and clean alpha edges. "
    "No scenery, floor plane, decorative frame, badge, UI, typography, label, logo, "
    "watermark, person, humanoid character or hands. No borrowed franchise logos. "
    "Do not depict game statistics or literal written catalogue descriptions. "
)

INTERPRETATIONS = {
    ("ingrediente", "Ricerca narrativa"): (
        "Abstract source entry represented symbolically by research tools; "
        "the illustration does not turn narrative research into a purchasable item."
    ),
    ("ingrediente", "Metallo o cuoio rigido"): (
        "The source offers material alternatives; both samples are shown together "
        "for identification without implying both are required."
    ),
    ("ingrediente", "Mercurio (o alcool)"): (
        "The source offers material alternatives; two sealed samples are visual "
        "identifiers, not a recipe or a simultaneous requirement."
    ),
    ("oggetto", "Strumento da taverna"): "Generic unspecified instrument illustrated as a concertina; artistic choice only.",
    ("oggetto", "Strumento di liuteria"): "Generic unspecified instrument illustrated as a mandolin; artistic choice only.",
    ("oggetto", "Strumento del maestro"): "Generic unspecified instrument illustrated as a violin; artistic choice only.",
}


def source_rows() -> list[dict]:
    source = (ROOT / "portale-officina-cambusa/index.html").read_text()
    decoder = json.JSONDecoder()
    rows = []
    seen = set()
    maps = {"oggetto": OBJECT_VISUALS, "piatto": DISH_VISUALS, "ingrediente": MATERIAL_VISUALS}
    for variable, kind, expected in SEEDS:
        match = re.search(r"\bvar\s+" + variable + r"\s*=\s*", source)
        if not match:
            raise ValueError(f"Seed not found: {variable}")
        group, _ = decoder.raw_decode(source[match.end():])
        if len(group) != expected:
            raise ValueError(f"{variable}: expected {expected} entries, found {len(group)}; review visual briefs before proceeding")
        names = {item["nome"] for item in group}
        if names != set(maps[kind]):
            raise ValueError(f"Visual briefs mismatch for {kind}: missing {names - set(maps[kind])}; stale {set(maps[kind]) - names}")
        for item in group:
            if item.get("tipo") != kind:
                raise ValueError(f"Unexpected seed type: {item.get('id')}")
            key = (kind, item["id"])
            if key in seen or not re.fullmatch(r"[\w-]+", item["id"], re.UNICODE):
                raise ValueError(f"Unsafe or repeated artwork key: {key}")
            seen.add(key)
            rows.append(item)
    return rows


def webp_dimensions(path: Path) -> tuple[int, int]:
    """Read the actual RIFF image header without requiring external libraries."""
    data = path.read_bytes()
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError(f"Not a WebP image: {path}")
    declared = struct.unpack_from("<I", data, 4)[0] + 8
    if declared != len(data):
        raise ValueError(f"Incomplete WebP image: {path}")
    offset = 12
    while offset + 8 <= len(data):
        kind = data[offset:offset + 4]
        size = struct.unpack_from("<I", data, offset + 4)[0]
        chunk = data[offset + 8:offset + 8 + size]
        if len(chunk) != size:
            raise ValueError(f"Truncated WebP chunk: {path}")
        if kind == b"VP8X" and size >= 10:
            return (1 + int.from_bytes(chunk[4:7], "little"), 1 + int.from_bytes(chunk[7:10], "little"))
        if kind == b"VP8 " and size >= 10 and chunk[3:6] == b"\x9d\x01\x2a":
            width, height = struct.unpack_from("<HH", chunk, 6)
            return width & 0x3FFF, height & 0x3FFF
        if kind == b"VP8L" and size >= 5 and chunk[0] == 0x2F:
            bits = int.from_bytes(chunk[1:5], "little")
            return 1 + (bits & 0x3FFF), 1 + ((bits >> 14) & 0x3FFF)
        offset += 8 + size + size % 2
    raise ValueError(f"Missing WebP size: {path}")


def job_for(item: dict, previous: dict | None = None) -> dict:
    kind = item["tipo"]
    name = item["nome"]
    details = item.get("dati", {})
    visual = {"oggetto": OBJECT_VISUALS, "piatto": DISH_VISUALS, "ingrediente": MATERIAL_VISUALS}[kind][name]
    category = details.get("categoria", "")
    family = details.get("famiglia", "")
    if kind == "piatto":
        subject_type = "A completed ready-to-eat galley dish or prepared drink; illustrate the finished preparation, not a raw ingredient bundle. "
    elif kind == "ingrediente" and category == "Ingredienti":
        subject_type = "An ingredient supply for cooking, not a composed ready-to-eat dish. Follow any explicit cured, pre-grilled, sauce or stock state in its name. "
    elif kind == "ingrediente":
        subject_type = "A raw material, fabrication component or preparation ingredient, not the finished crafted equipment that may use it. "
    else:
        subject_type = "A finished pirate workshop tool, supply or equipment item, not a pile of its crafting ingredients. "
    filename = "".join(char for char in unicodedata.normalize("NFD", item["id"]) if not unicodedata.combining(char))
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", filename):
        raise ValueError(f"Cannot map canonical ID to a safe artwork filename: {item['id']}")
    src = f"/img/catalogo/{filename}.webp"
    job = {
        "tipo": kind,
        "id": item["id"],
        "nome": name,
        "category": category,
        "family": family,
        "description": item.get("descrizione", ""),
        "description_usage": "Read-only source reference. Game statistics are never illustrated or changed.",
        "src": src,
        "width": 512,
        "height": 512,
        "visual_brief": visual,
        "prompt": STYLE + f'Exact Italian catalogue subject: “{name}” ({kind}). ' + subject_type + visual,
        "transparent_background": True,
        "status": "pending",
    }
    note = INTERPRETATIONS.get((kind, name))
    if note:
        job["interpretation_note"] = note
    # Keep human provenance/approval notes between rebuilds, never stale status.
    for field in ("generation", "review", "approved", "source_image", "original_path"):
        if previous and field in previous:
            job[field] = previous[field]
    image = ROOT / src.lstrip("/")
    if image.is_file():
        width, height = webp_dimensions(image)
        if (width, height) != (512, 512):
            raise ValueError(f"Expected 512 × 512 final picture: {image} is {width} × {height}")
        job["status"] = "complete"
        job["bytes"] = image.stat().st_size
        job["sha256"] = hashlib.sha256(image.read_bytes()).hexdigest()
    return job


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".pending")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build", action="store_true", help="Also rebuild catalog.js and manifest.json from completed local images only")
    args = parser.parse_args()
    jobs_path = ROOT / "artifacts/catalog-art/jobs.json"
    previous = {}
    if jobs_path.is_file():
        data = json.loads(jobs_path.read_text())
        previous = {(item["tipo"], item["id"]): item for item in data.get("entries", [])}
    rows = source_rows()
    jobs = [job_for(row, previous.get((row["tipo"], row["id"]))) for row in rows]
    complete = [job for job in jobs if job["status"] == "complete"]
    counts = dict(Counter(job["tipo"] for job in jobs))
    doc = {
        "schema_version": 1,
        "purpose": "Original individual colour anime catalogue illustrations; presentation only, no gameplay changes.",
        "source": "portale-officina-cambusa/index.html:SEED_OGGETTI,SEED_PIATTI,SEED_INGREDIENTI",
        "style_reference": "/img/catalogo/seed_bussola_artigianale.webp",
        "final_size": {"width": 512, "height": 512},
        "counts": {"total": len(jobs), "complete": len(complete), "pending": len(jobs) - len(complete), "by_type": counts},
        "entries": jobs,
    }
    write_json(jobs_path, doc)
    # Public prompt archive is separate from runtime manifests. It documents all
    # planned subjects but cannot cause ungenerated pictures to appear in cards.
    write_json(ROOT / "img/catalogo/prompts.json", doc)
    if args.build:
        entries = [{field: job[field] for field in ("tipo", "id", "nome", "src", "width", "height", "bytes", "sha256")} for job in complete]
        manifest = {"schema_version": 1, "count": len(entries), "planned": len(jobs), "entries": entries}
        write_json(ROOT / "img/catalogo/manifest.json", manifest)
        output = "/* Generated by strumenti/catalogo-illustrazioni.py --build; completed local images only. */\n"
        output += "(function(root){'use strict';root.GLCCatalogArtEntries=Object.freeze("
        output += json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
        output += ".map(Object.freeze));})(typeof window==='undefined'?globalThis:window);\n"
        temporary = ROOT / "img/catalogo/catalog.js.pending"
        temporary.write_text(output)
        temporary.replace(ROOT / "img/catalogo/catalog.js")
    print(f"Catalogue artwork: {len(jobs)} briefs ({counts}); {len(complete)} complete, {len(jobs) - len(complete)} pending.")
    print("Uncompleted subjects remain absent from the runtime manifest and use its existing fallback.")


if __name__ == "__main__":
    main()
