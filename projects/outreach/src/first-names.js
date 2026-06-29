// Curated set of common English/Western first names for UK and US markets.
// Used as an allowlist — a candidate must appear here to be accepted as a name.

const FIRST_NAMES = new Set([
  // Male — classic English
  'Aaron', 'Adam', 'Adrian', 'Alan', 'Albert', 'Alec', 'Alex', 'Alexander', 'Alfred', 'Alfie',
  'Alistair', 'Allan', 'Allen', 'Andrew', 'Andy', 'Angus', 'Anthony', 'Archie', 'Arthur', 'Austin',
  'Barry', 'Ben', 'Benjamin', 'Billy', 'Bobby', 'Bradley', 'Brandon', 'Brett', 'Brian', 'Bruce',
  'Bryan', 'Callum', 'Calvin', 'Cameron', 'Carl', 'Carlos', 'Carson', 'Charles', 'Charlie', 'Christian',
  'Christopher', 'Chris', 'Cian', 'Colin', 'Colton', 'Connor', 'Conor', 'Craig', 'Dale', 'Daniel',
  'Danny', 'Darren', 'David', 'Dean', 'Declan', 'Dennis', 'Derek', 'Dylan', 'Eoin', 'Eric',
  'Ethan', 'Eugene', 'Evan', 'Fergus', 'Finn', 'Frank', 'Fraser', 'Freddie', 'Frederick', 'Gary',
  'Gavin', 'George', 'Gerald', 'Glen', 'Graham', 'Gregory', 'Greg', 'Hamish', 'Harold', 'Harry',
  'Henry', 'Hudson', 'Hunter', 'Iain', 'Ian', 'Isaac', 'Jack', 'Jacob', 'Jake', 'James',
  'Jamie', 'Jason', 'Jeffrey', 'Jeff', 'Jeremy', 'Jesse', 'Joe', 'Joel', 'John', 'Johnny',
  'Jonathan', 'Jordan', 'Joseph', 'Josh', 'Joshua', 'Justin', 'Keith', 'Kenneth', 'Kevin', 'Kyle',
  'Larry', 'Lawrence', 'Leo', 'Leonard', 'Liam', 'Logan', 'Louis', 'Lucas', 'Luke', 'Malcolm',
  'Marcus', 'Mark', 'Martin', 'Mason', 'Matthew', 'Matt', 'Michael', 'Miles', 'Murray', 'Nathan',
  'Neil', 'Niall', 'Nicholas', 'Nick', 'Noah', 'Nolan', 'Oliver', 'Owen', 'Padraig', 'Patrick',
  'Paul', 'Peter', 'Philip', 'Phillip', 'Ralph', 'Randy', 'Raymond', 'Richard', 'Robert', 'Robin',
  'Roger', 'Ronald', 'Rory', 'Ross', 'Roy', 'Russell', 'Ryan', 'Samuel', 'Scott', 'Sean',
  'Sebastian', 'Seamus', 'Shane', 'Shaun', 'Simon', 'Stephen', 'Steve', 'Steven', 'Stuart',
  'Stewart', 'Terry', 'Theodore', 'Thomas', 'Tim', 'Timothy', 'Tobias', 'Toby', 'Tom', 'Tyler',
  'Vincent', 'Walter', 'Wayne', 'William', 'Willie', 'Wyatt', 'Zachary', 'Zach',

  // Male — modern / millennial / Gen Z
  'Aiden', 'Asher', 'Axel', 'Blake', 'Brody', 'Cade', 'Chase', 'Cole', 'Cooper', 'Easton',
  'Eli', 'Elijah', 'Elliot', 'Elliott', 'Emmett', 'Felix', 'Grayson', 'Harrison', 'Hayes', 'Hudson',
  'Jace', 'Jackson', 'Jaxon', 'Jasper', 'Jonah', 'Kai', 'Landon', 'Levi', 'Lincoln', 'Luca',
  'Max', 'Maxwell', 'Miles', 'Mitchell', 'Mitch', 'Oscar', 'Parker', 'Preston', 'Quinn', 'Reid',
  'Roman', 'Rowan', 'Sawyer', 'Spencer', 'Theo', 'Trent', 'Trevor', 'Tristan', 'Tucker', 'Wesley',
  'Wilder', 'Xavier', 'Xander',

  // Female — classic English
  'Abigail', 'Alice', 'Alison', 'Amanda', 'Amy', 'Andrea', 'Angela', 'Ann', 'Anna', 'Anne',
  'Ashley', 'Barbara', 'Beatrice', 'Becky', 'Betty', 'Beverly', 'Brenda', 'Brittany', 'Carol',
  'Carolyn', 'Catherine', 'Cathy', 'Charlotte', 'Cheryl', 'Christine', 'Christina', 'Cynthia',
  'Danielle', 'Deborah', 'Debra', 'Diana', 'Diane', 'Dorothy', 'Elizabeth', 'Emily', 'Emma',
  'Evelyn', 'Frances', 'Georgia', 'Gloria', 'Grace', 'Hannah', 'Heather', 'Helen', 'Irene',
  'Jacqueline', 'Janet', 'Janice', 'Jennifer', 'Jessica', 'Joan', 'Jodie', 'Joanna', 'Joanne',
  'Joyce', 'Judith', 'Julie', 'Karen', 'Katherine', 'Kathleen', 'Kelly', 'Kimberly', 'Laura',
  'Lauren', 'Linda', 'Lisa', 'Margaret', 'Maria', 'Marilyn', 'Martha', 'Mary', 'Megan', 'Melissa',
  'Michelle', 'Monica', 'Nancy', 'Natalie', 'Nicole', 'Pamela', 'Patricia', 'Rachel', 'Rebecca',
  'Sandra', 'Sara', 'Sarah', 'Sharon', 'Shirley', 'Stephanie', 'Susan', 'Teresa', 'Theresa',
  'Tiffany', 'Tracy', 'Tracey', 'Victoria', 'Virginia',

  // Female — modern / millennial / Gen Z
  'Addison', 'Alexis', 'Alyssa', 'Amber', 'Aria', 'Aubrey', 'Aurora', 'Ava', 'Avery', 'Bella',
  'Brooke', 'Chloe', 'Claire', 'Clare', 'Ella', 'Ellie', 'Eliana', 'Eleanor', 'Elena', 'Esme',
  'Everly', 'Freya', 'Gabrielle', 'Gemma', 'Hazel', 'Holly', 'Imogen', 'Isla', 'Jade', 'Jenna',
  'Jess', 'Jemma', 'Kayla', 'Kennedy', 'Layla', 'Leah', 'Lexi', 'Lily', 'Lillian', 'Lucy',
  'Luna', 'Lydia', 'Mackenzie', 'Madison', 'Maddie', 'Maya', 'Millie', 'Molly', 'Nora', 'Olivia',
  'Paige', 'Penelope', 'Phoebe', 'Poppy', 'Riley', 'Rose', 'Ruby', 'Samantha', 'Scarlett', 'Sienna',
  'Skylar', 'Sophia', 'Sophie', 'Stella', 'Summer', 'Taylor', 'Thea', 'Tilly', 'Violet', 'Zoe', 'Zoey',

  // UK/Irish/Scottish — female
  'Ailsa', 'Aoife', 'Bea', 'Betsy', 'Caoimhe', 'Catriona', 'Clodagh', 'Daisy', 'Eilidh', 'Erin',
  'Fiona', 'Fionnuala', 'Georgie', 'Gillian', 'Grainne', 'Harriet', 'Kirsty', 'Lesley', 'Lottie',
  'Lynsey', 'Moira', 'Morven', 'Nell', 'Niamh', 'Orla', 'Rhona', 'Rhiannon', 'Sinead', 'Siobhan',

  // UK/Irish/Scottish — male
  'Alasdair', 'Ciaran', 'Donal', 'Duncan', 'Euan', 'Fergal', 'Finlay', 'Hamish', 'Kieran', 'Lorcan',
  'Paddy', 'Rian', 'Ruairi', 'Rupert', 'Tadhg',

  // International — common in UK/US contexts
  'Aisha', 'Amara', 'Amelia', 'Amira', 'Anita', 'Deepa', 'Deepak', 'Fatima', 'Hana', 'Kavita',
  'Laila', 'Meera', 'Mia', 'Nadia', 'Nisha', 'Pooja', 'Priya', 'Raj', 'Rahul', 'Rania',
  'Rekha', 'Sofia', 'Sonia', 'Sunita', 'Yasmin', 'Zainab',
]);

export default FIRST_NAMES;
