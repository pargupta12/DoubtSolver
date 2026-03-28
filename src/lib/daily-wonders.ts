/**
 * 100 "Today's Wonder" questions — fascinating curiosity sparks for children.
 * One is shown per day, rotating through the list based on day-of-year.
 */

const WONDERS = [
  // Science & Nature
  "Did you know an octopus has 3 hearts? Why does it need so many?",
  "Honey never goes bad — even 3000-year-old honey was still edible! Why?",
  "A teaspoon of a neutron star weighs 6 billion kg. How is that possible?",
  "Why is the sky blue during the day but red during sunset?",
  "How do birds know which direction to fly when they migrate?",
  "Why do cats always land on their feet when they fall?",
  "What would happen if the Earth stopped spinning for one second?",
  "How does a chameleon change its colour?",
  "Why do we get hiccups? And why are they so hard to stop?",
  "How do fireflies make their own light?",
  "Why does hot water freeze faster than cold water sometimes?",
  "If you dig a hole through the Earth, where would you come out?",
  "Why do we see lightning before we hear thunder?",
  "How do fish breathe underwater without lungs?",
  "Why is space completely silent — no sound at all?",
  "What makes rainbows appear after rain?",
  "Why do onions make you cry when you cut them?",
  "How do spiders make silk that is stronger than steel?",
  "Why do leaves change colour in autumn?",
  "What is the fastest thing in the entire universe?",

  // Human Body
  "You blink about 15 times every minute — that's 10,000 times a day! Why?",
  "Your brain uses 20% of all your body's energy. What is it doing?",
  "Why do you get wrinkly fingers after swimming?",
  "How many times does your heart beat in one day?",
  "Why can't you tickle yourself?",
  "What happens inside your body when you sneeze?",
  "Why do we dream? Does everyone dream every night?",
  "Your stomach acid can dissolve metal! How does your stomach survive?",
  "Why do we yawn — and why is yawning contagious?",
  "How does your brain remember things?",

  // Space & Planets
  "A day on Venus is longer than a year on Venus! How?",
  "What colour is the sunset on Mars?",
  "How many Earths could fit inside Jupiter?",
  "Why does the Moon look different every night?",
  "What would happen if you shouted in space?",
  "How far away is the nearest star after the Sun?",
  "Why do astronauts float in space?",
  "Saturn's rings are made of ice — some pieces are as big as houses!",
  "What is a black hole and could Earth fall into one?",
  "How old is the Sun — and how long will it last?",

  // Animals & Plants
  "A group of flamingos is called a 'flamboyance'. Why are they pink?",
  "Elephants are the only animals that cannot jump. Why?",
  "How does a Venus flytrap catch insects?",
  "Why do dogs wag their tails?",
  "A blue whale's heart is as big as a small car! How?",
  "How do ants carry objects 50 times heavier than themselves?",
  "Why do roosters crow in the morning?",
  "Dolphins sleep with one eye open! Why?",
  "How does a tiny seed grow into a giant tree?",
  "Why do some animals glow in the dark deep ocean?",

  // Math & Numbers
  "Why is the number zero so important — who invented it?",
  "What is the biggest number with a name?",
  "Why do we count in 10s — could we count in 12s instead?",
  "How did ancient people do math without calculators?",
  "What is pi (π) and why does it go on forever?",
  "If you fold a paper 42 times, it would reach the Moon! Is this true?",
  "Why is the triangle the strongest shape in the world?",
  "How do computers think using only 0s and 1s?",
  "What is the Fibonacci sequence and where is it hidden in nature?",
  "Why do clocks go 'clockwise' — who decided that direction?",

  // History & World
  "The Great Wall of China took over 2000 years to build! Why?",
  "Who were the first humans to use fire — and how did they discover it?",
  "Why did ancient Egyptians build the pyramids?",
  "How did people travel before cars and planes were invented?",
  "Who invented the first school — and why?",
  "Why do we shake hands when we greet someone?",
  "How did India get its name?",
  "Who invented the internet — and when?",
  "Why do different countries have different languages?",
  "What was the first message ever sent on a telephone?",

  // Geography & Earth
  "The Amazon rainforest makes 20% of the world's oxygen!",
  "Why does the Dead Sea not let you sink — you just float!",
  "What causes an earthquake — and can we predict them?",
  "Why is the ocean salty but rivers are not?",
  "Mount Everest grows about 1 cm taller every year! Why?",
  "What is inside a volcano — and why does it erupt?",
  "How are islands formed in the middle of an ocean?",
  "Why does India have monsoons every year?",
  "The Sahara Desert was once green with rivers and trees! What changed?",
  "Why are there 24 time zones — and who decided this?",

  // Technology & Inventions
  "Your phone has more computing power than the rocket that went to the Moon!",
  "How does WiFi send information through the air?",
  "Who built the first robot — and what could it do?",
  "How does a touch screen know where your finger is?",
  "What is the cloud — where is your data actually stored?",
  "How does Google find answers in 0.5 seconds?",
  "Why do we need passwords — and how do hackers crack them?",
  "How do self-driving cars see the road?",
  "What is AI and can a computer really think?",
  "How does a 3D printer build objects out of thin air?",

  // GK & Fun Facts
  "India has 22 official languages — more than any European country!",
  "The human nose can detect 1 trillion different smells!",
  "Bananas are slightly radioactive! Is that dangerous?",
  "Cows have best friends and get stressed when separated!",
  "Your bones are 4 times stronger than concrete!",
  "The shortest war in history lasted only 38 minutes!",
  "There are more trees on Earth than stars in the Milky Way!",
  "Why is a football (soccer ball) made of pentagons and hexagons?",
  "Glass is actually a liquid that flows very, very slowly!",
  "Butterflies taste with their feet — imagine eating like that!",
];

/**
 * Returns today's wonder question based on day-of-year.
 * Rotates through the list — after 100 days, starts over.
 */
export function getTodaysWonder(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return WONDERS[dayOfYear % WONDERS.length]!;
}

export default WONDERS;
