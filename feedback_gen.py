"""
Feedback generator - realistic customer reviews with buried market signals.

The key challenge: feedback should feel authentic and require careful reading to extract
the actual signal. Customers don't explicitly say "the spiciness was the deciding factor" -
they tell stories, share emotions, make comparisons, and bury their actual reasoning in
tangential details.

Design principles:
1. Misdirection - customers talk a lot about things that DIDN'T matter
2. Buried signals - the real reason is mentioned indirectly, often in passing
3. Emotional noise - feelings and stories obscure the logic
4. Comparative reasoning - "compared to X" or "unlike Y" hints at what matters
5. Negation patterns - what they DON'T complain about often matters most
6. Context-dependent - the same phrase can signal different things
"""

import random
from dataclasses import dataclass
from typing import List, Optional

ATTRIBUTES = ["spiciness", "flavor", "portion", "ambiance"]

# Paradigm shift can add these attributes mid-game
PARADIGM_ATTRIBUTES = ["authenticity", "presentation", "speed_of_service", "value"]

# Synonyms and related concepts for each attribute (used indirectly)
ATTRIBUTE_CONCEPTS = {
    "spiciness": ["heat", "kick", "fire", "burn", "chili", "pepper", "hot", "warmth", "tingle", "intensity"],
    "flavor": ["taste", "seasoning", "depth", "complexity", "richness", "savory", "balanced", "notes", "profile", "layers"],
    "portion": ["size", "amount", "generous", "filling", "quantity", "value", "enough", "substantial", "hearty", "serving"],
    "ambiance": ["atmosphere", "vibe", "decor", "music", "lighting", "space", "feel", "environment", "setting", "mood"],
    # Paradigm shift attributes
    "authenticity": ["genuine", "real", "traditional", "heritage", "roots", "honest", "true", "original", "cultural", "soul"],
    "presentation": ["plating", "looks", "visual", "Instagram", "aesthetic", "colors", "arranged", "appearance", "beautiful", "style"],
    "speed_of_service": ["wait", "timing", "quick", "prompt", "efficient", "fast", "service", "brought out", "ready", "delivery"],
    "value": ["price", "worth", "cost", "money", "affordable", "expensive", "deal", "bang for buck", "reasonable", "priced"],
}


@dataclass
class Feedback:
    """Customer feedback with varying levels of truth."""
    verbose_text: str
    stated_preference: str
    actual_driver: str
    is_positive: bool


class CustomerPersona:
    """Different customer types write very differently."""

    def __init__(self, name: str, writing_style: dict):
        self.name = name
        self.style = writing_style


# Rich customer personas with distinct voices
PERSONAS = [
    CustomerPersona("yelp_regular", {
        "verbose": True,
        "uses_ratings": True,
        "mentions_history": True,
        "emotional": True,
    }),
    CustomerPersona("busy_professional", {
        "terse": True,
        "focuses_on_efficiency": True,
        "mentions_time": True,
    }),
    CustomerPersona("foodie_blogger", {
        "flowery": True,
        "uses_food_terms": True,
        "makes_comparisons": True,
        "verbose": True,
    }),
    CustomerPersona("group_organizer", {
        "mentions_others": True,
        "consensus_focused": True,
        "practical": True,
    }),
    CustomerPersona("casual_visitor", {
        "simple": True,
        "brief": True,
        "straightforward": True,
    }),
    CustomerPersona("regular_customer", {
        "comparative": True,
        "mentions_changes": True,
        "loyal_tone": True,
    }),
]


class FeedbackGenerator:
    """Generates realistic customer feedback with buried signals."""

    # === OPENING TEMPLATES ===
    # These establish context but rarely contain the signal

    OPENINGS_POSITIVE = [
        "Finally got around to trying this place after hearing about it for months.",
        "Stopped by on a whim last Tuesday and I'm glad I did.",
        "Third visit now and I think I've figured out what keeps me coming back.",
        "My coworker wouldn't stop talking about this place so I had to see for myself.",
        "Was looking for somewhere new and this popped up on my feed.",
        "Celebrated my birthday here last week - good choice.",
        "The line was long but we decided to wait it out.",
        "Almost didn't come in because parking was a nightmare, but persevered.",
        "Took the team here for lunch - interesting experience.",
        "Date night pick that actually worked out for once.",
        "Random Tuesday lunch that turned into a pleasant surprise.",
        "Friend dragged me here against my better judgment. Okay, fine, they were right.",
        "Was skeptical based on the exterior but decided to give it a shot.",
    ]

    OPENINGS_NEGATIVE = [
        "Had high hopes based on the reviews but reality was different.",
        "Wanted to love this place - the concept is great on paper.",
        "Gave it another shot after a mediocre first visit. Hmm.",
        "The hype had me expecting more, I'll be honest.",
        "Tried to like it, I really did.",
        "My expectations might have been too high going in.",
        "The Instagram photos looked better than what showed up.",
        "Second time here hoping the first was a fluke.",
        "Friend's recommendation didn't quite pan out for me.",
        "Was in the mood for something great, left feeling meh.",
        "Wanted this to be my new regular spot. Not sure now.",
        "The concept is interesting but execution is another story.",
    ]

    # === MISDIRECTION BLOCKS ===
    # These talk extensively about things that DON'T actually matter
    # They distract from the real signal

    MISDIRECTION = {
        "spiciness": [
            # Talk about spiciness when it's NOT the driver
            "The heat level was fine I guess - they have different options which is nice. I went medium.",
            "I usually ask for extra spice but didn't feel the need to here. The default was adequate.",
            "They asked about spice preference which I appreciated. Went with their recommendation.",
            "Spice-wise it was what you'd expect. Nothing that would blow your head off but present.",
            "For those wondering about heat - it's adjustable. I didn't find that particularly memorable either way.",
        ],
        "flavor": [
            # Talk about flavor when it's NOT the driver
            "Taste was acceptable - standard chili profile, nothing revolutionary but competent.",
            "Seasoning was on point, I'd say. They know the basics.",
            "The flavor was there. Not mind-blowing but not offensive either.",
            "Tasted like decent chili. You know what you're getting.",
            "Flavor profile is traditional, which some people will appreciate.",
        ],
        "portion": [
            # Talk about portions when it's NOT the driver
            "Size was reasonable for the price point. Not huge but I wasn't hungry after.",
            "Portions seemed standard - I've seen bigger but also smaller.",
            "Got the regular size, seemed appropriate. Could upsize if needed.",
            "Amount of food was fine. Filling enough without being excessive.",
            "The serving was what I expected based on the price.",
        ],
        "ambiance": [
            # Talk about ambiance when it's NOT the driver
            "The space is fine - typical casual spot, nothing fancy but clean.",
            "Decor is what it is. Not why you come here.",
            "Atmosphere is basic but functional. Gets the job done.",
            "Environment was acceptable - not a destination vibe but comfortable enough.",
            "The setting is modest. I wasn't really paying attention to it honestly.",
        ],
        # Paradigm shift attributes
        "authenticity": [
            "It feels like a normal chili joint. Nothing particularly traditional or modern.",
            "Can't really tell if they're going for authentic or not. Standard approach.",
            "The heritage angle isn't played up, which is fine by me.",
            "Didn't get any particular cultural vibe. Just straightforward.",
            "Whether it's traditional or not, I couldn't say. Tastes like chili.",
        ],
        "presentation": [
            "Plating is functional - it's a bowl of chili, what do you expect.",
            "Not Instagram-worthy but that's okay. I'm here to eat, not photograph.",
            "The visual aspect is fine. Standard bowls, standard setup.",
            "Didn't think much about how it looked. It looked like food.",
            "Presentation is plain but I didn't mind. Substance over style.",
        ],
        "speed_of_service": [
            "Service was average speed. Not particularly fast or slow.",
            "Food came out in a reasonable time. Nothing notable.",
            "Waited a normal amount. No complaints on timing.",
            "They weren't rushing but weren't dragging either.",
            "Service pace was fine. Normal for this kind of place.",
        ],
        "value": [
            "Price seemed about right for what you get. Standard markup.",
            "Cost is what you'd expect. Not cheap but not outrageous.",
            "Fair enough pricing. Middle of the road.",
            "Didn't feel ripped off or like I got a steal. Just normal.",
            "Value is whatever. Paid, ate, moved on.",
        ],
    }

    # === BURIED POSITIVE SIGNALS ===
    # These are the actual signals but buried in context or mentioned indirectly

    BURIED_SIGNALS_POSITIVE = {
        "spiciness": [
            "I do think their approach to building the heat is what sets them apart though. It's not just hot - it's layered.",
            "My sinuses were clearing in the best way. Left feeling invigorated if that makes sense.",
            "The warmth stays with you. I was still thinking about that slow burn an hour later.",
            "That kick at the end really elevates it. Most places either go too hard or play it safe.",
            "Noticed my lips tingling halfway through and realized I was smiling. That's the good stuff.",
            "There's something about how the heat builds that keeps you going back for more.",
            "The pepper blend they use is interesting - complex, not just painful.",
            "I kept reaching for water but also kept eating. That's the mark of heat done right.",
            "Whatever chili they're using has this warmth that lingers without overwhelming.",
            "The intensity is dialed in perfectly. Enough to wake you up without making you regret it.",
        ],
        "flavor": [
            "What really got me was the depth. You can taste that they actually thought about the recipe.",
            "Every bite had something new going on. The layers here are real.",
            "I found myself trying to identify all the notes - cumin, something smoky, maybe coriander?",
            "The taste stuck with me. Not in a 'what did I just eat' way but in a 'I want that again' way.",
            "There's a richness here that most places just don't achieve. Clearly someone knows what they're doing.",
            "The seasoning has nuance. It's not just salt and chili powder like everywhere else.",
            "That depth of taste is what I'm always chasing. Finally found it.",
            "Complex without being confused - they understand how flavors work together.",
            "The balance is impeccable. Nothing dominates, everything contributes.",
            "I've had a lot of chili. This actually tastes like someone cared about the profile.",
        ],
        "portion": [
            "Left genuinely satisfied which is rare these days. No need to stop somewhere else after.",
            "The value here is unreal. I couldn't finish it and I was hungry going in.",
            "My friend and I ended up sharing and still had plenty. That's how it should be.",
            "Finally a place that doesn't skimp. You actually get what you pay for and then some.",
            "I was worried it wouldn't be enough but it kept going. Solid serving.",
            "The bowl seemed bottomless in the best way. Definitely got my money's worth.",
            "Took half home and it made a solid lunch the next day too.",
            "They're not being stingy with the portions here. Refreshing.",
            "Actually felt full after, which shouldn't be noteworthy but here we are.",
            "Generous is the word. You will not leave hungry.",
        ],
        "ambiance": [
            "The whole experience just felt right. Hard to put my finger on why but I was comfortable.",
            "Something about the space made me want to linger. We stayed way longer than planned.",
            "It just has good energy? Like when a place feels alive but not hectic.",
            "The vibe they've created here is special. It's not trying too hard but it works.",
            "I noticed I was relaxed in a way I usually am not at restaurants. The atmosphere does something.",
            "The lighting, the music, the whole package - someone put thought into the experience.",
            "It feels like a neighborhood spot even though I don't live here. That's a rare quality.",
            "The setting makes the food better somehow. Context matters.",
            "You want to come back just to be there. The environment is that welcoming.",
            "They've nailed the feel of the place. It's intangible but you notice it.",
        ],
        # Paradigm shift attributes
        "authenticity": [
            "There's something real here. You can taste that someone actually cares about doing it right.",
            "It reminded me of food I had in Texas. The genuine article, not a copy.",
            "They're not chasing trends, they're honoring traditions. That matters.",
            "You can feel the heritage in every bite. This isn't corporate chili.",
            "There's soul in this bowl. It's made by people who believe in what they're doing.",
            "Finally a place that's not trying to reinvent the wheel. Just honest, real chili.",
            "It tastes like it has a story. Like someone's grandmother would approve.",
            "The authenticity comes through. You know when something is genuine.",
            "They're doing it the right way, the way it should be done.",
            "There's integrity here. No shortcuts, no gimmicks, just the real thing.",
        ],
        "presentation": [
            "I'll admit I took a picture before eating. It just looked that good.",
            "The way they plate it shows they care about the whole experience, not just taste.",
            "It's almost too pretty to eat. Almost.",
            "My friend immediately said 'that's going on Instagram' when it arrived.",
            "The colors, the arrangement - someone has an eye for this.",
            "Visual appeal matters more than people admit. This delivered on that.",
            "It looked as good as it tasted. That's rare.",
            "The presentation elevated the whole meal. Sets expectations high, then meets them.",
            "They understand that you eat with your eyes first. Nailed it.",
            "Beautiful plating. Made me appreciate the dish before I even tried it.",
        ],
        "speed_of_service": [
            "Food hit the table faster than I expected. Still hot, perfectly timed.",
            "The efficiency here is impressive. Ordered, and boom - it's there.",
            "No waiting around. They respect that your time matters.",
            "Fastest I've ever been served here. And the quality didn't suffer.",
            "In and out in twenty minutes with a full meal. That's how it should be.",
            "The timing was perfect. Just long enough to settle in, not so long you get impatient.",
            "They run a tight operation. Food appears almost magically.",
            "I mentioned I was in a hurry and they actually delivered. Props.",
            "Quick without feeling rushed. That's a hard balance to strike.",
            "The speed impressed me. I could actually make my next appointment.",
        ],
        "value": [
            "For what you pay, this is a steal. Seriously underpriced.",
            "The value proposition here is unbeatable. More food, less money, great taste.",
            "I checked the bill twice because I thought they'd missed something. Nope, just that reasonable.",
            "Finally a place where you don't feel robbed. Fair pricing, honest portions.",
            "Best bang for your buck in the area. Not even close.",
            "The quality to price ratio is excellent. They're not gouging you.",
            "I would've paid more. The fact that I didn't have to is a pleasant surprise.",
            "Great food at fair prices. That shouldn't be remarkable but it is.",
            "This is what affordable dining should look like. Accessible without compromising.",
            "You're getting way more than you're paying for. That's rare these days.",
        ],
    }

    # === BURIED NEGATIVE SIGNALS ===
    # The signal for what's wrong, buried in other complaints

    BURIED_SIGNALS_NEGATIVE = {
        "spiciness": [
            "Everything else was acceptable but there was something missing in terms of excitement, you know? It was just... flat.",
            "I kept waiting for it to wake up my taste buds somehow. That moment never came.",
            "Perfectly fine if you don't want any excitement. A bit too tame for my preferences.",
            "It's missing that thing that makes you sit up and take notice. Very one-note.",
            "I wanted more oomph. More of something. It felt too safe, too bland in a way that's hard to describe.",
            "Where's the fire? Where's the life? It just sat there.",
            "They're playing it too conservative. There's no edge, no thrill.",
            "Fine for people who want mild but I was bored by the third bite.",
            "Zero excitement. Zero personality in that dimension.",
            "It needs something to make it pop. Currently it's just... there.",
        ],
        "flavor": [
            "I couldn't really point to what I was eating. Generic would be generous - it was more like... absent?",
            "Kept searching for something distinctive and came up empty.",
            "It's not bad, it's just not anything. Nothing memorable happening.",
            "If you asked me to describe the taste I'd struggle. It's that forgettable.",
            "There should be more going on. This tastes like the idea of chili, not actual chili.",
            "Something was fundamentally missing. Depth? Complexity? Soul?",
            "The recipe needs work. It tastes like a first draft.",
            "I've had more interesting microwave chili. And I don't mean that as a compliment.",
            "Where are the layers? Where's the craft? It's just... simple in a bad way.",
            "Tastes like they're going through the motions. No love in it.",
        ],
        "portion": [
            "I found myself looking at the bowl wondering if that was really it. Still hungry after.",
            "For what they charge you'd expect more. I did the math and it's not great.",
            "Had to grab something else on the way home which defeats the purpose.",
            "Left wanting more, and not in a 'this was so good' way. In a 'that wasn't enough' way.",
            "The price to food ratio is off. You feel a bit cheated.",
            "I've had bigger appetizers. This was supposed to be a meal.",
            "My friend looked at her bowl and laughed. Not in a good way.",
            "Would it kill them to fill the bowl? There's clearly room.",
            "You're paying for the location, not the food amount.",
            "I could see the bottom of the bowl way too soon. That's never a good sign.",
        ],
        "ambiance": [
            "Hard to enjoy your food when the environment is actively working against you.",
            "The whole experience was off because of everything around the food, if that makes sense.",
            "I was uncomfortable the entire time. Not the food's fault but it affected everything.",
            "Would have enjoyed it more literally anywhere else. The setting drags it down.",
            "Something about being there just didn't feel right. Couldn't relax.",
            "The space needs work. It's got bad energy or bad layout or bad something.",
            "I was distracted by everything except the food. Too much wrong with the environment.",
            "You're fighting the vibe the whole time. It's exhausting.",
            "Not somewhere I'd want to bring anyone. The atmosphere is that off.",
            "The setting undermines whatever they're doing with the food.",
        ],
        # Paradigm shift attributes
        "authenticity": [
            "It feels manufactured somehow. Like they're checking boxes without understanding why.",
            "Where's the soul? Where's the passion? This tastes like a committee designed it.",
            "It's trying to be something it's not. The fakeness comes through.",
            "Corporate chili. You can taste the focus groups.",
            "No heritage here. No tradition. Just going through the motions.",
            "It's chili by numbers. Technically correct, spiritually empty.",
            "You can tell they don't actually care. It's just product, not food.",
            "Missing the authenticity that separates good from great. This is just stuff.",
            "Feels like a chain restaurant pretending to be local. The mask slips.",
            "No conviction, no story, no soul. Just calories.",
        ],
        "presentation": [
            "It looked sad in the bowl. Just kind of dumped there.",
            "The visual was so uninspiring I almost didn't want to eat it.",
            "Not Instagram-worthy. Not even 'text a friend' worthy. Depressing to look at.",
            "They clearly don't care how it looks. Which affects the whole experience.",
            "Presentation was an afterthought. Sloppy, careless, unappetizing.",
            "My friend laughed when it arrived. 'That's the best they can do?'",
            "Ugly food can still taste good but this didn't even try.",
            "The visual aspect actively made it worse. Hard to get excited about that.",
            "Looks like someone already ate it once. Presentation zero.",
            "You eat with your eyes first, and my eyes said no thanks.",
        ],
        "speed_of_service": [
            "We waited. And waited. And waited some more.",
            "By the time the food arrived, I'd lost my appetite from the wait.",
            "If I wanted to wait this long, I'd cook at home.",
            "The service was glacial. I had time to read a whole article on my phone.",
            "Slowest meal I've had in months. The food wasn't worth the wait.",
            "They forgot about us. Multiple times. Not great.",
            "I asked twice about our order. 'It's coming' was a lie both times.",
            "The inefficiency here is staggering. Do they only have one person?",
            "If you're in a hurry, don't come here. Or if you value your time at all.",
            "Waited so long I almost left. Probably should have.",
        ],
        "value": [
            "For what you pay, you should get more. A lot more.",
            "The prices don't match what you get. And not in a good way.",
            "I felt like I'd been taken advantage of when I saw the bill.",
            "Overpriced for what it is. You're paying for the location, not the food.",
            "Could've had twice the food elsewhere for the same money.",
            "The value proposition is terrible. This should cost half as much.",
            "I kept looking for what I was paying for. Still haven't found it.",
            "Not worth the money. Simple as that.",
            "You're getting ripped off here. Save your cash for somewhere else.",
            "The price to quality ratio is insulting. They think we're stupid.",
        ],
    }

    # === TANGENTIAL STORIES ===
    # Complete misdirection - stories that have nothing to do with the signal

    TANGENT_STORIES = [
        "Funny story - I actually came here by accident. Was looking for somewhere else and ended up here instead.",
        "The person at the next table was having a very loud phone conversation which was entertaining in its own way.",
        "Parking situation is worth mentioning - street parking only but usually spots available.",
        "They have a loyalty card which I forgot to get stamped. Next time.",
        "Ran into someone I knew from college. Small world.",
        "The menu has a lot of options I didn't try - might come back to explore.",
        "Took forever to decide what to order. Too many choices sometimes.",
        "My friend spent ten minutes taking photos before eating. You know how it is.",
        "They were playing some interesting music - didn't recognize it but it was catchy.",
        "Overheard the table next to us debating best chili in the city. Strong opinions.",
        "The server recommended something but I went with my gut instead.",
        "Kids menu available which is useful info for some people.",
        "They do catering apparently. Might be good for the office.",
        "Credit card only which caught me off guard. No cash.",
        "Website hours were wrong - they actually close earlier on weekends.",
    ]

    # === COMPARATIVE STATEMENTS ===
    # These compare to other experiences and can hint at what matters

    COMPARISONS_POSITIVE = {
        "spiciness": [
            "Unlike a lot of places that think hot means good, they understand the difference.",
            "Reminded me of this spot in Austin that knew how to build heat properly.",
            "Most chili around here is timid. This isn't.",
            "Finally someone who isn't afraid of actual spice.",
        ],
        "flavor": [
            "It's not like those places where you can't tell one dish from another.",
            "Compared to the usual fare around here, there's actual craft involved.",
            "Most spots phone it in on the recipe. This tastes considered.",
            "It's got what the chains are missing - actual personality in the taste.",
        ],
        "portion": [
            "Unlike most places that nickel and dime you, this is honest.",
            "Compared to [other spot] down the street, you're getting way more.",
            "It's not like those trendy places with tiny portions and huge prices.",
            "Finally somewhere that feeds you like they mean it.",
        ],
        "ambiance": [
            "It's got something most new spots lack - it feels real.",
            "Compared to those sterile fast-casual places, this has warmth.",
            "Unlike the chains, there's actually a soul to the place.",
            "Most spots feel corporate. This feels human.",
        ],
        # Paradigm shift attributes
        "authenticity": [
            "Unlike all those wannabe joints, this is the real deal.",
            "Compared to the copycat places, there's actual heritage here.",
            "Most places fake it. This one lives it.",
            "It's what other restaurants pretend to be.",
        ],
        "presentation": [
            "Unlike the sloppy competition, they actually care about how it looks.",
            "Most places just dump it in a bowl. This is art.",
            "Compared to the usual slop, this is a visual treat.",
            "It looks as good as anywhere I've been. Better than most.",
        ],
        "speed_of_service": [
            "Unlike those places where you wait forever, this is efficient.",
            "Compared to everywhere else around here, the speed is remarkable.",
            "Most restaurants forget you exist. Not this one.",
            "Service that actually respects your time. Novel concept.",
        ],
        "value": [
            "Unlike everywhere else that's overcharging, this is honest.",
            "Compared to similar spots, you're getting twice the value.",
            "Most places are a rip-off. This is fair.",
            "It's priced like they want you to come back.",
        ],
    }

    # === CLOSING STATEMENTS ===

    CLOSINGS_POSITIVE = [
        "Anyway, would go back.",
        "Worth a visit if you're in the area.",
        "Not perfect but I'll be returning.",
        "Solid spot. Now I get why people talk about it.",
        "Adding it to the rotation.",
        "Would recommend with appropriate expectations.",
        "Looking forward to trying other items.",
        "Good enough that I'm writing this review.",
        "Will probably become a regular.",
        "Finally a spot that delivers.",
    ]

    CLOSINGS_NEGATIVE = [
        "Probably won't be back but your mileage may vary.",
        "Not for me but I can see the appeal for some people.",
        "Maybe they were having an off day.",
        "I wanted to like it more than I did.",
        "Will give it one more chance but not optimistic.",
        "There are better options nearby honestly.",
        "Not bad, just not worth going out of your way.",
        "Some things to work on.",
        "Had potential but didn't deliver.",
        "Back to the search I guess.",
    ]

    def generate(self, hot_attribute: str, is_positive: bool, all_attributes: list = None) -> Feedback:
        """Generate realistic customer feedback with buried signals."""

        # Use provided attributes or default to base attributes
        active_attrs = all_attributes if all_attributes else ATTRIBUTES

        # Pick what the customer talks MOST about (often not the actual driver)
        other_attrs = [a for a in active_attrs if a != hot_attribute]

        # 70% of the time, they emphasize something OTHER than what actually mattered
        if random.random() < 0.7:
            stated = random.choice(other_attrs)
        else:
            stated = hot_attribute

        # Pick additional misdirection topics
        misdirection_topics = random.sample(other_attrs, k=min(2, len(other_attrs)))

        parts = []

        # Opening
        if is_positive:
            parts.append(random.choice(self.OPENINGS_POSITIVE))
        else:
            parts.append(random.choice(self.OPENINGS_NEGATIVE))

        # Add some misdirection about non-signal attributes
        for topic in misdirection_topics:
            if random.random() < 0.7:  # Don't always include
                parts.append(random.choice(self.MISDIRECTION[topic]))

        # Maybe add a tangent story (30% chance)
        if random.random() < 0.3:
            parts.append(random.choice(self.TANGENT_STORIES))

        # THE BURIED SIGNAL - this is what actually matters
        if is_positive:
            parts.append(random.choice(self.BURIED_SIGNALS_POSITIVE[hot_attribute]))
        else:
            parts.append(random.choice(self.BURIED_SIGNALS_NEGATIVE[hot_attribute]))

        # Maybe add a comparison (40% chance)
        if random.random() < 0.4 and is_positive:
            parts.append(random.choice(self.COMPARISONS_POSITIVE[hot_attribute]))

        # More misdirection after the signal to bury it
        remaining_topics = [t for t in other_attrs if t not in misdirection_topics]
        if remaining_topics and random.random() < 0.5:
            parts.append(random.choice(self.MISDIRECTION[random.choice(remaining_topics)]))

        # Closing
        if is_positive:
            parts.append(random.choice(self.CLOSINGS_POSITIVE))
        else:
            parts.append(random.choice(self.CLOSINGS_NEGATIVE))

        verbose = " ".join(parts)

        return Feedback(
            verbose_text=verbose,
            stated_preference=stated,
            actual_driver=hot_attribute,
            is_positive=is_positive,
        )

    def generate_batch(self, hot_attribute: str, count: int = 3) -> List[Feedback]:
        """Generate multiple feedback items."""
        feedbacks = []

        # Ensure at least one positive and one negative for contrast
        if count >= 2:
            feedbacks.append(self.generate(hot_attribute, is_positive=True))
            feedbacks.append(self.generate(hot_attribute, is_positive=False))
            for _ in range(count - 2):
                feedbacks.append(self.generate(hot_attribute, random.choice([True, False])))
        else:
            for _ in range(count):
                feedbacks.append(self.generate(hot_attribute, random.choice([True, False])))

        random.shuffle(feedbacks)
        return feedbacks


# Test
if __name__ == "__main__":
    gen = FeedbackGenerator()
    print("=" * 80)
    print("TESTING FEEDBACK GENERATOR")
    print("=" * 80)

    for attr in ATTRIBUTES:
        print(f"\n{'=' * 40}")
        print(f"HOT ATTRIBUTE: {attr.upper()}")
        print("=" * 40)

        for is_pos in [True, False]:
            print(f"\n--- {'POSITIVE' if is_pos else 'NEGATIVE'} REVIEW ---")
            fb = gen.generate(attr, is_pos)
            print(f"Text: {fb.verbose_text}")
            print(f"\n[Hidden info - Stated: {fb.stated_preference}, Actual: {fb.actual_driver}]")
