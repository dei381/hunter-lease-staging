import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const brands = [
  {
    name: "Toyota",
    models: [
      { name: "Camry", trims: [{ name: "LE", msrp: 29495 }, { name: "SE", msrp: 31200 }, { name: "XLE", msrp: 34400 }, { name: "XSE", msrp: 35600 }] },
      { name: "Corolla", trims: [{ name: "LE", msrp: 23145 }, { name: "SE", msrp: 25585 }, { name: "XSE", msrp: 28235 }, { name: "Hybrid LE", msrp: 24595 }, { name: "Hybrid XSE", msrp: 28340 }] },
      { name: "Corolla Cross", trims: [{ name: "L", msrp: 25210 }, { name: "XLE", msrp: 29435 }, { name: "Hybrid S", msrp: 29570 }, { name: "Hybrid XSE", msrp: 32755 }] },
      { name: "Prius", trims: [{ name: "LE", msrp: 29045 }, { name: "XLE", msrp: 32490 }, { name: "Limited", msrp: 36060 }] },
      { name: "Prius Prime", trims: [{ name: "SE", msrp: 34070 }, { name: "XSE", msrp: 37320 }, { name: "XSE Premium", msrp: 40765 }] },
      { name: "Crown", trims: [{ name: "XLE", msrp: 41435 }, { name: "Limited", msrp: 47045 }, { name: "Platinum", msrp: 54465 }] },
      { name: "Crown Signia", trims: [{ name: "XLE", msrp: 44985 }, { name: "Limited", msrp: 49385 }] },
      { name: "Mirai", trims: [{ name: "XLE", msrp: 51215 }, { name: "Limited", msrp: 68180 }] }, // CA Exclusive/Heavy
      { name: "bZ4X", trims: [{ name: "XLE", msrp: 44420 }, { name: "Limited", msrp: 48530 }] },
      { name: "RAV4", trims: [{ name: "LE", msrp: 30025 }, { name: "XLE", msrp: 31525 }, { name: "Limited", msrp: 38280 }, { name: "Hybrid XLE", msrp: 33225 }, { name: "Hybrid Limited", msrp: 41230 }] },
      { name: "RAV4 Prime", trims: [{ name: "SE", msrp: 45040 }, { name: "XSE", msrp: 48910 }] },
      { name: "Venza", trims: [{ name: "LE", msrp: 36465 }, { name: "XLE", msrp: 40675 }, { name: "Nightshade", msrp: 41790 }, { name: "Limited", msrp: 44610 }] },
      { name: "Highlander", trims: [{ name: "LE", msrp: 40665 }, { name: "XLE", msrp: 43815 }, { name: "Limited", msrp: 48070 }, { name: "Hybrid XLE", msrp: 45420 }] },
      { name: "Grand Highlander", trims: [{ name: "XLE", msrp: 44715 }, { name: "Limited", msrp: 49505 }, { name: "Hybrid MAX Platinum", msrp: 59825 }] },
      { name: "4Runner", trims: [{ name: "SR5", msrp: 42100 }, { name: "TRD Off-Road", msrp: 45945 }, { name: "TRD Pro", msrp: 56565 }] },
      { name: "Sequoia", trims: [{ name: "SR5", msrp: 63125 }, { name: "Platinum", msrp: 75715 }, { name: "TRD Pro", msrp: 80980 }, { name: "Capstone", msrp: 80115 }] },
      { name: "Tacoma", trims: [{ name: "SR5", msrp: 37695 }, { name: "TRD Off-Road", msrp: 43295 }, { name: "Trailhunter", msrp: 64395 }, { name: "TRD Pro", msrp: 65395 }] },
      { name: "Tundra", trims: [{ name: "SR5", msrp: 47300 }, { name: "Limited", msrp: 53755 }, { name: "TRD Pro", msrp: 73930 }, { name: "Capstone", msrp: 80695 }] },
      { name: "Sienna", trims: [{ name: "LE", msrp: 39180 }, { name: "XSE", msrp: 46740 }, { name: "Platinum", msrp: 54600 }] }
    ]
  },
  {
    name: "Honda",
    models: [
      { name: "Civic", trims: [{ name: "LX", msrp: 25045 }, { name: "Sport", msrp: 26645 }, { name: "EX", msrp: 28045 }, { name: "Touring", msrp: 31645 }, { name: "Sport Hybrid", msrp: 29845 }, { name: "Sport Touring Hybrid", msrp: 32845 }] },
      { name: "Accord", trims: [{ name: "LX", msrp: 28990 }, { name: "EX", msrp: 31005 }, { name: "Sport Hybrid", msrp: 33290 }, { name: "EX-L Hybrid", msrp: 34935 }, { name: "Touring Hybrid", msrp: 39295 }] },
      { name: "HR-V", trims: [{ name: "LX", msrp: 25450 }, { name: "Sport", msrp: 27550 }, { name: "EX-L", msrp: 29550 }] },
      { name: "CR-V", trims: [{ name: "LX", msrp: 30850 }, { name: "EX", msrp: 33355 }, { name: "Sport Hybrid", msrp: 34700 }, { name: "EX-L", msrp: 36005 }, { name: "Sport Touring Hybrid", msrp: 40855 }] },
      { name: "Prologue", trims: [{ name: "EX", msrp: 48795 }, { name: "Touring", msrp: 53095 }, { name: "Elite", msrp: 59295 }] }, // EV
      { name: "Passport", trims: [{ name: "EX-L", msrp: 43295 }, { name: "TrailSport", msrp: 45895 }, { name: "Black Edition", msrp: 49365 }] },
      { name: "Pilot", trims: [{ name: "Sport", msrp: 41295 }, { name: "EX-L", msrp: 44595 }, { name: "TrailSport", msrp: 49895 }, { name: "Elite", msrp: 54175 }] },
      { name: "Odyssey", trims: [{ name: "EX", msrp: 39635 }, { name: "EX-L", msrp: 42705 }, { name: "Sport", msrp: 43555 }, { name: "Touring", msrp: 46655 }, { name: "Elite", msrp: 51765 }] },
      { name: "Ridgeline", trims: [{ name: "Sport", msrp: 41145 }, { name: "RTL", msrp: 43975 }, { name: "TrailSport", msrp: 46375 }, { name: "Black Edition", msrp: 47745 }] }
    ]
  },
  {
    name: "Ford",
    models: [
      { name: "Mustang", trims: [{ name: "EcoBoost", msrp: 32515 }, { name: "GT", msrp: 44090 }, { name: "Dark Horse", msrp: 60865 }] },
      { name: "Mustang Mach-E", trims: [{ name: "Select", msrp: 41990 }, { name: "Premium", msrp: 44990 }, { name: "GT", msrp: 55990 }, { name: "Rally", msrp: 60990 }] },
      { name: "Escape", trims: [{ name: "Active", msrp: 30990 }, { name: "ST-Line", msrp: 31985 }, { name: "Platinum", msrp: 38510 }, { name: "PHEV", msrp: 41995 }] },
      { name: "Bronco Sport", trims: [{ name: "Big Bend", msrp: 31390 }, { name: "Outer Banks", msrp: 35690 }, { name: "Badlands", msrp: 39985 }] },
      { name: "Bronco", trims: [{ name: "Big Bend", msrp: 41025 }, { name: "Outer Banks", msrp: 47940 }, { name: "Badlands", msrp: 51390 }, { name: "Wildtrak", msrp: 61920 }, { name: "Raptor", msrp: 91930 }] },
      { name: "Explorer", trims: [{ name: "Active", msrp: 41220 }, { name: "ST-Line", msrp: 45920 }, { name: "ST", msrp: 56800 }, { name: "Platinum", msrp: 53120 }] },
      { name: "Expedition", trims: [{ name: "XLT", msrp: 61490 }, { name: "Limited", msrp: 70310 }, { name: "Timberline", msrp: 73600 }, { name: "Platinum", msrp: 82595 }] },
      { name: "Maverick", trims: [{ name: "XL", msrp: 25415 }, { name: "XLT", msrp: 27915 }, { name: "Lariat", msrp: 36450 }, { name: "Hybrid XLT", msrp: 29415 }, { name: "Hybrid Lariat", msrp: 37950 }] },
      { name: "Ranger", trims: [{ name: "XL", msrp: 34265 }, { name: "XLT", msrp: 37705 }, { name: "Lariat", msrp: 45225 }, { name: "Raptor", msrp: 57065 }] },
      { name: "F-150", trims: [{ name: "XL", msrp: 38765 }, { name: "XLT", msrp: 49615 }, { name: "Lariat", msrp: 66990 }, { name: "Platinum", msrp: 75725 }, { name: "Raptor", msrp: 80325 }] },
      { name: "F-150 Lightning", trims: [{ name: "Pro", msrp: 51990 }, { name: "XLT", msrp: 56990 }, { name: "Flash", msrp: 69990 }, { name: "Lariat", msrp: 79490 }, { name: "Platinum", msrp: 86990 }] }
    ]
  },
  {
    name: "Chevrolet",
    models: [
      { name: "Trax", trims: [{ name: "LS", msrp: 21495 }, { name: "LT", msrp: 23395 }, { name: "ACTIV", msrp: 24995 }] },
      { name: "Trailblazer", trims: [{ name: "LS", msrp: 24395 }, { name: "LT", msrp: 25595 }, { name: "RS", msrp: 28395 }, { name: "ACTIV", msrp: 28395 }] },
      { name: "Equinox", trims: [{ name: "LT", msrp: 29495 }, { name: "RS", msrp: 32345 }, { name: "ACTIV", msrp: 34795 }] },
      { name: "Equinox EV", trims: [{ name: "1LT", msrp: 34995 }, { name: "2LT", msrp: 43295 }, { name: "2RS", msrp: 44795 }, { name: "3LT", msrp: 45295 }, { name: "3RS", msrp: 46795 }] },
      { name: "Blazer", trims: [{ name: "2LT", msrp: 36795 }, { name: "3LT", msrp: 40695 }, { name: "RS", msrp: 44195 }, { name: "Premier", msrp: 44195 }] },
      { name: "Blazer EV", trims: [{ name: "LT", msrp: 50195 }, { name: "RS", msrp: 54595 }, { name: "SS", msrp: 61995 }] },
      { name: "Traverse", trims: [{ name: "LS", msrp: 38995 }, { name: "LT", msrp: 41395 }, { name: "Z71", msrp: 47795 }, { name: "RS", msrp: 55595 }] },
      { name: "Tahoe", trims: [{ name: "LS", msrp: 58195 }, { name: "LT", msrp: 63695 }, { name: "Z71", msrp: 68295 }, { name: "High Country", msrp: 78895 }] },
      { name: "Suburban", trims: [{ name: "LS", msrp: 61195 }, { name: "LT", msrp: 66695 }, { name: "Z71", msrp: 71295 }, { name: "High Country", msrp: 81895 }] },
      { name: "Colorado", trims: [{ name: "WT", msrp: 31095 }, { name: "LT", msrp: 33495 }, { name: "Trail Boss", msrp: 38895 }, { name: "Z71", msrp: 41795 }, { name: "ZR2", msrp: 48395 }] },
      { name: "Silverado 1500", trims: [{ name: "WT", msrp: 38795 }, { name: "LT", msrp: 49995 }, { name: "RST", msrp: 54295 }, { name: "High Country", msrp: 64695 }, { name: "ZR2", msrp: 71895 }] },
      { name: "Silverado EV", trims: [{ name: "3WT", msrp: 74800 }, { name: "4WT", msrp: 79800 }, { name: "RST First Edition", msrp: 96495 }] },
      { name: "Corvette", trims: [{ name: "1LT", msrp: 69995 }, { name: "2LT", msrp: 77095 }, { name: "3LT", msrp: 81745 }, { name: "Z06 1LZ", msrp: 111795 }, { name: "E-Ray 1LZ", msrp: 106595 }] }
    ]
  },
  {
    name: "Hyundai",
    models: [
      { name: "Elantra", trims: [{ name: "SE", msrp: 22775 }, { name: "SEL", msrp: 24725 }, { name: "Limited", msrp: 28215 }, { name: "N Line", msrp: 29615 }, { name: "Hybrid Blue", msrp: 27400 }, { name: "Hybrid Limited", msrp: 30600 }, { name: "N", msrp: 34850 }] },
      { name: "Sonata", trims: [{ name: "SEL", msrp: 28650 }, { name: "N Line", msrp: 36100 }, { name: "Limited", msrp: 38350 }, { name: "Hybrid SEL", msrp: 31950 }, { name: "Hybrid Limited", msrp: 38350 }] },
      { name: "Venue", trims: [{ name: "SE", msrp: 21275 }, { name: "SEL", msrp: 23025 }, { name: "Limited", msrp: 24525 }] },
      { name: "Kona", trims: [{ name: "SE", msrp: 25625 }, { name: "SEL", msrp: 27075 }, { name: "N Line", msrp: 32175 }, { name: "Limited", msrp: 33175 }] },
      { name: "Kona Electric", trims: [{ name: "SE", msrp: 34050 }, { name: "SEL", msrp: 38050 }, { name: "Limited", msrp: 42400 }] },
      { name: "Tucson", trims: [{ name: "SE", msrp: 28875 }, { name: "SEL", msrp: 31025 }, { name: "XRT", msrp: 35600 }, { name: "Limited", msrp: 38035 }, { name: "Hybrid Blue", msrp: 33700 }, { name: "Hybrid Limited", msrp: 40845 }, { name: "PHEV SEL", msrp: 39830 }, { name: "PHEV Limited", msrp: 45650 }] },
      { name: "Santa Fe", trims: [{ name: "SE", msrp: 35345 }, { name: "SEL", msrp: 37845 }, { name: "XRT", msrp: 41995 }, { name: "Limited", msrp: 44745 }, { name: "Calligraphy", msrp: 47895 }, { name: "Hybrid SEL", msrp: 38345 }, { name: "Hybrid Calligraphy", msrp: 48395 }] },
      { name: "Palisade", trims: [{ name: "SE", msrp: 38045 }, { name: "SEL", msrp: 40795 }, { name: "XRT", msrp: 43195 }, { name: "Limited", msrp: 49345 }, { name: "Calligraphy", msrp: 51745 }] },
      { name: "Santa Cruz", trims: [{ name: "SE", msrp: 28275 }, { name: "SEL", msrp: 31025 }, { name: "Night", msrp: 39835 }, { name: "XRT", msrp: 41425 }, { name: "Limited", msrp: 42695 }] },
      { name: "Ioniq 5", trims: [{ name: "SE Standard Range", msrp: 43175 }, { name: "SE", msrp: 47225 }, { name: "SEL", msrp: 48775 }, { name: "Limited", msrp: 54675 }, { name: "N", msrp: 67475 }] },
      { name: "Ioniq 6", trims: [{ name: "SE Standard Range", msrp: 38650 }, { name: "SE", msrp: 43600 }, { name: "SEL", msrp: 46400 }, { name: "Limited", msrp: 51300 }] },
      { name: "Nexo", trims: [{ name: "Blue", msrp: 61470 }, { name: "Limited", msrp: 64920 }] } // CA Exclusive Hydrogen
    ]
  },
  {
    name: "Kia",
    models: [
      { name: "Forte", trims: [{ name: "LX", msrp: 21145 }, { name: "LXS", msrp: 21645 }, { name: "GT-Line", msrp: 23645 }, { name: "GT", msrp: 25845 }] },
      { name: "K5", trims: [{ name: "LXS", msrp: 26745 }, { name: "GT-Line", msrp: 28245 }, { name: "EX", msrp: 30645 }, { name: "GT", msrp: 33145 }] },
      { name: "Soul", trims: [{ name: "LX", msrp: 21565 }, { name: "S", msrp: 24065 }, { name: "GT-Line", msrp: 25165 }, { name: "EX", msrp: 25865 }] },
      { name: "Seltos", trims: [{ name: "LX", msrp: 25865 }, { name: "S", msrp: 26465 }, { name: "EX", msrp: 27265 }, { name: "X-Line", msrp: 30165 }, { name: "SX", msrp: 31465 }] },
      { name: "Niro", trims: [{ name: "LX", msrp: 28315 }, { name: "EX", msrp: 31015 }, { name: "SX", msrp: 33915 }, { name: "PHEV EX", msrp: 35765 }, { name: "PHEV SX Touring", msrp: 41465 }, { name: "EV Wind", msrp: 40975 }, { name: "EV Wave", msrp: 45975 }] },
      { name: "Sportage", trims: [{ name: "LX", msrp: 28565 }, { name: "EX", msrp: 30565 }, { name: "SX Prestige", msrp: 36065 }, { name: "X-Pro", msrp: 37565 }, { name: "Hybrid EX", msrp: 33465 }, { name: "Hybrid SX Prestige", msrp: 38665 }, { name: "PHEV X-Line", msrp: 40965 }, { name: "PHEV X-Line Prestige", msrp: 45465 }] },
      { name: "Sorento", trims: [{ name: "LX", msrp: 33365 }, { name: "S", msrp: 35765 }, { name: "EX", msrp: 39365 }, { name: "SX", msrp: 43065 }, { name: "X-Pro SX Prestige", msrp: 48765 }, { name: "Hybrid EX", msrp: 38065 }, { name: "Hybrid SX Prestige", msrp: 43865 }, { name: "PHEV EX", msrp: 49365 }, { name: "PHEV SX Prestige", msrp: 54465 }] },
      { name: "Telluride", trims: [{ name: "LX", msrp: 37585 }, { name: "S", msrp: 39485 }, { name: "EX", msrp: 43185 }, { name: "SX", msrp: 47385 }, { name: "SX Prestige", msrp: 52285 }] },
      { name: "Carnival", trims: [{ name: "LX", msrp: 34995 }, { name: "EX", msrp: 40495 }, { name: "SX", msrp: 43195 }, { name: "SX Prestige", msrp: 48095 }, { name: "Hybrid EX", msrp: 42495 }] },
      { name: "EV6", trims: [{ name: "Light", msrp: 43975 }, { name: "Wind", msrp: 49075 }, { name: "GT-Line", msrp: 54275 }, { name: "GT", msrp: 62975 }] },
      { name: "EV9", trims: [{ name: "Light", msrp: 56395 }, { name: "Wind", msrp: 65395 }, { name: "Land", msrp: 71395 }, { name: "GT-Line", msrp: 75395 }] }
    ]
  },
  {
    name: "BMW",
    models: [
      { name: "2 Series", trims: [{ name: "230i", msrp: 39395 }, { name: "M240i", msrp: 50695 }, { name: "M2", msrp: 64195 }] },
      { name: "3 Series", trims: [{ name: "330i", msrp: 45495 }, { name: "330e (PHEV)", msrp: 46595 }, { name: "M340i", msrp: 58595 }, { name: "M3", msrp: 76995 }] },
      { name: "4 Series", trims: [{ name: "430i", msrp: 49295 }, { name: "M440i", msrp: 62245 }, { name: "M4", msrp: 80095 }] },
      { name: "i4", trims: [{ name: "eDrive35", msrp: 53195 }, { name: "eDrive40", msrp: 58295 }, { name: "xDrive40", msrp: 62595 }, { name: "M50", msrp: 70695 }] },
      { name: "5 Series", trims: [{ name: "530i", msrp: 58895 }, { name: "540i xDrive", msrp: 65895 }, { name: "550e xDrive (PHEV)", msrp: 74795 }] },
      { name: "i5", trims: [{ name: "eDrive40", msrp: 67795 }, { name: "xDrive40", msrp: 71095 }, { name: "M60", msrp: 85095 }] },
      { name: "7 Series", trims: [{ name: "740i", msrp: 97395 }, { name: "760i xDrive", msrp: 122295 }, { name: "750e xDrive (PHEV)", msrp: 107995 }] },
      { name: "i7", trims: [{ name: "eDrive50", msrp: 106695 }, { name: "xDrive60", msrp: 125195 }, { name: "M70", msrp: 169495 }] },
      { name: "X1", trims: [{ name: "xDrive28i", msrp: 41495 }, { name: "M35i", msrp: 50895 }] },
      { name: "X3", trims: [{ name: "sDrive30i", msrp: 47895 }, { name: "xDrive30i", msrp: 49895 }, { name: "M40i", msrp: 62895 }, { name: "X3 M", msrp: 76495 }] },
      { name: "X5", trims: [{ name: "sDrive40i", msrp: 66195 }, { name: "xDrive40i", msrp: 68495 }, { name: "xDrive50e (PHEV)", msrp: 73495 }, { name: "M60i", msrp: 90295 }, { name: "X5 M", msrp: 123295 }] },
      { name: "X7", trims: [{ name: "xDrive40i", msrp: 82895 }, { name: "M60i", msrp: 110895 }, { name: "Alpina XB7", msrp: 150395 }] },
      { name: "iX", trims: [{ name: "xDrive50", msrp: 88095 }, { name: "M60", msrp: 112495 }] },
      { name: "XM", trims: [{ name: "XM (PHEV)", msrp: 159995 }, { name: "Label Red", msrp: 185995 }] }
    ]
  },
  {
    name: "Mercedes-Benz",
    models: [
      { name: "CLA", trims: [{ name: "CLA 250", msrp: 44350 }, { name: "AMG CLA 35", msrp: 56100 }] },
      { name: "C-Class", trims: [{ name: "C 300", msrp: 49100 }, { name: "C 300 4MATIC", msrp: 51100 }, { name: "AMG C 43", msrp: 61850 }, { name: "AMG C 63 S E PERFORMANCE", msrp: 85050 }] },
      { name: "E-Class", trims: [{ name: "E 350 4MATIC", msrp: 63450 }, { name: "E 450 4MATIC", msrp: 69250 }] },
      { name: "S-Class", trims: [{ name: "S 500 4MATIC", msrp: 118450 }, { name: "S 580 4MATIC", msrp: 129150 }, { name: "S 580e 4MATIC (PHEV)", msrp: 128900 }] },
      { name: "GLA", trims: [{ name: "GLA 250", msrp: 43000 }, { name: "GLA 250 4MATIC", msrp: 45000 }, { name: "AMG GLA 35", msrp: 58050 }] },
      { name: "GLB", trims: [{ name: "GLB 250", msrp: 45450 }, { name: "GLB 250 4MATIC", msrp: 47450 }, { name: "AMG GLB 35", msrp: 60100 }] },
      { name: "GLC", trims: [{ name: "GLC 300", msrp: 48600 }, { name: "GLC 300 4MATIC", msrp: 50600 }, { name: "GLC 350e 4MATIC (PHEV)", msrp: 61050 }, { name: "AMG GLC 43", msrp: 66050 }] },
      { name: "GLE", trims: [{ name: "GLE 350 4MATIC", msrp: 63800 }, { name: "GLE 450 4MATIC", msrp: 70650 }, { name: "GLE 450e 4MATIC (PHEV)", msrp: 70650 }, { name: "AMG GLE 53", msrp: 87900 }] },
      { name: "GLS", trims: [{ name: "GLS 450 4MATIC", msrp: 88150 }, { name: "GLS 580 4MATIC", msrp: 113150 }, { name: "AMG GLS 63", msrp: 147000 }] },
      { name: "G-Class", trims: [{ name: "G 550", msrp: 144150 }, { name: "AMG G 63", msrp: 180950 }, { name: "G 580 with EQ Technology", msrp: 160000 }] },
      { name: "EQB", trims: [{ name: "EQB 250+", msrp: 53800 }, { name: "EQB 300 4MATIC", msrp: 57650 }, { name: "EQB 350 4MATIC", msrp: 61300 }] },
      { name: "EQE Sedan", trims: [{ name: "EQE 350+", msrp: 76050 }, { name: "EQE 350 4MATIC", msrp: 76050 }, { name: "EQE 500 4MATIC", msrp: 87050 }, { name: "AMG EQE", msrp: 108050 }] },
      { name: "EQE SUV", trims: [{ name: "EQE 350+", msrp: 79050 }, { name: "EQE 350 4MATIC", msrp: 79050 }, { name: "EQE 500 4MATIC", msrp: 90650 }, { name: "AMG EQE SUV", msrp: 110450 }] },
      { name: "EQS Sedan", trims: [{ name: "EQS 450+", msrp: 105550 }, { name: "EQS 450 4MATIC", msrp: 108550 }, { name: "EQS 580 4MATIC", msrp: 128550 }, { name: "AMG EQS", msrp: 148700 }] },
      { name: "EQS SUV", trims: [{ name: "EQS 450+", msrp: 105550 }, { name: "EQS 450 4MATIC", msrp: 108550 }, { name: "EQS 580 4MATIC", msrp: 128550 }] }
    ]
  },
  {
    name: "Audi",
    models: [
      { name: "A3", trims: [{ name: "Premium 40 TFSI", msrp: 36495 }, { name: "Premium Plus 40 TFSI", msrp: 40095 }, { name: "S3 Premium", msrp: 48095 }] },
      { name: "A4", trims: [{ name: "Premium 40 TFSI", msrp: 42295 }, { name: "Premium Plus 40 TFSI", msrp: 46495 }, { name: "Premium 45 TFSI", msrp: 44495 }, { name: "S4 Premium", msrp: 54895 }] },
      { name: "A5", trims: [{ name: "Premium 45 TFSI", msrp: 48795 }, { name: "Premium Plus 45 TFSI", msrp: 53095 }, { name: "S5 Premium", msrp: 58595 }] },
      { name: "A6", trims: [{ name: "Premium 45 TFSI", msrp: 58395 }, { name: "Premium Plus 45 TFSI", msrp: 61895 }, { name: "Premium 55 TFSI", msrp: 62895 }] },
      { name: "Q3", trims: [{ name: "Premium 40 TFSI", msrp: 38195 }, { name: "Premium Plus 40 TFSI", msrp: 41095 }, { name: "Premium 45 TFSI", msrp: 40595 }] },
      { name: "Q5", trims: [{ name: "Premium 40 TFSI", msrp: 45795 }, { name: "Premium Plus 40 TFSI", msrp: 50595 }, { name: "Premium 45 TFSI", msrp: 48695 }, { name: "Premium 55 TFSI e (PHEV)", msrp: 59895 }, { name: "SQ5 Premium", msrp: 58895 }] },
      { name: "Q7", trims: [{ name: "Premium 45 TFSI", msrp: 60695 }, { name: "Premium Plus 45 TFSI", msrp: 64495 }, { name: "Premium 55 TFSI", msrp: 66495 }, { name: "SQ7 Premium Plus", msrp: 91695 }] },
      { name: "Q8", trims: [{ name: "Premium 55 TFSI", msrp: 74895 }, { name: "Premium Plus 55 TFSI", msrp: 78795 }, { name: "SQ8 Premium Plus", msrp: 97795 }] },
      { name: "Q4 e-tron", trims: [{ name: "Premium 40", msrp: 50995 }, { name: "Premium Plus 40", msrp: 55695 }, { name: "Premium 50", msrp: 56395 }] },
      { name: "Q4 Sportback e-tron", trims: [{ name: "Premium 50", msrp: 59395 }, { name: "Premium Plus 50", msrp: 64095 }] },
      { name: "Q8 e-tron", trims: [{ name: "Premium", msrp: 75595 }, { name: "Premium Plus", msrp: 79995 }, { name: "Prestige", msrp: 85995 }] },
      { name: "Q8 Sportback e-tron", trims: [{ name: "Premium", msrp: 78995 }, { name: "Premium Plus", msrp: 83395 }, { name: "Prestige", msrp: 89395 }] },
      { name: "e-tron GT", trims: [{ name: "Premium Plus", msrp: 107995 }, { name: "Prestige", msrp: 115995 }, { name: "RS e-tron GT", msrp: 148595 }] }
    ]
  },
  {
    name: "Lexus",
    models: [
      { name: "IS", trims: [{ name: "IS 300", msrp: 41235 }, { name: "IS 300 F SPORT Design", msrp: 43055 }, { name: "IS 350 F SPORT Design", msrp: 44410 }, { name: "IS 500 F SPORT Performance", msrp: 60020 }] },
      { name: "ES", trims: [{ name: "ES 250 AWD", msrp: 43190 }, { name: "ES 350", msrp: 43190 }, { name: "ES 300h", msrp: 44590 }, { name: "ES 350 F SPORT Design", msrp: 47775 }, { name: "ES 350 Ultra Luxury", msrp: 53480 }] },
      { name: "LS", trims: [{ name: "LS 500", msrp: 80685 }, { name: "LS 500 F SPORT", msrp: 84825 }, { name: "LS 500h", msrp: 115560 }] },
      { name: "UX", trims: [{ name: "UX 250h", msrp: 36690 }, { name: "UX 250h Premium", msrp: 39150 }, { name: "UX 250h F SPORT Design", msrp: 39150 }, { name: "UX 300h", msrp: 37490 }] },
      { name: "NX", trims: [{ name: "NX 250", msrp: 40605 }, { name: "NX 350 AWD", msrp: 44365 }, { name: "NX 350h AWD", msrp: 44615 }, { name: "NX 450h+ AWD (PHEV)", msrp: 59905 }] },
      { name: "RX", trims: [{ name: "RX 350", msrp: 49950 }, { name: "RX 350 Premium", msrp: 52100 }, { name: "RX 350h", msrp: 52100 }, { name: "RX 350h Premium", msrp: 53800 }, { name: "RX 450h+ Luxury (PHEV)", msrp: 70580 }, { name: "RX 500h F SPORT Performance", msrp: 64100 }] },
      { name: "TX", trims: [{ name: "TX 350", msrp: 55050 }, { name: "TX 350 Premium", msrp: 58450 }, { name: "TX 500h F SPORT Performance", msrp: 69350 }, { name: "TX 550h+ Luxury (PHEV)", msrp: 78050 }] },
      { name: "GX", trims: [{ name: "GX 550 Premium", msrp: 64250 }, { name: "GX 550 Overtrail", msrp: 69250 }, { name: "GX 550 Luxury", msrp: 77250 }] },
      { name: "LX", trims: [{ name: "LX 600", msrp: 93915 }, { name: "LX 600 Premium", msrp: 101865 }, { name: "LX 600 F SPORT Handling", msrp: 108125 }, { name: "LX 600 Ultra Luxury", msrp: 134490 }] },
      { name: "RZ", trims: [{ name: "RZ 300e Premium", msrp: 55150 }, { name: "RZ 450e Premium", msrp: 59850 }, { name: "RZ 450e Luxury", msrp: 65580 }] }
    ]
  }
];

const carDb = {
  makes: brands.map(brand => ({
    id: brand.name.toLowerCase().replace(/\s+/g, '-'),
    name: brand.name,
    models: brand.models.map(model => ({
      id: model.name.toLowerCase().replace(/\s+/g, '-'),
      name: model.name,
      trims: model.trims.map(trim => {
        // Generate realistic values based on MSRP
        const rv = 0.55 + (Math.random() * 0.10); // 55% to 65%
        const mf = 0.00150 + (Math.random() * 0.00150); // 0.00150 to 0.00300
        const apr = 3.9 + (Math.random() * 4.0); // 3.9% to 7.9%
        
        // CRITICAL: NEVER set a default dealer discount. Only the admin can add discounts.
        const savings = 0; 
        
        // Add some brand-specific incentives
        const incentives = [];
        if (brand.name === 'Kia' || brand.name === 'Hyundai') {
          incentives.push({ id: `${brand.name.toLowerCase()}-loyalty`, name: "Loyalty Cash", amount: 500, type: "rebate", isDefault: false });
        }
        if (brand.name === 'BMW' || brand.name === 'Mercedes-Benz' || brand.name === 'Audi') {
          incentives.push({ id: `${brand.name.toLowerCase()}-corp`, name: "Corporate Fleet", amount: 1500, type: "rebate", isDefault: false });
        }
        if (model.name.includes('EV') || model.name.includes('Ioniq') || model.name.includes('e-tron') || model.name.includes('PHEV') || trim.name.includes('PHEV') || model.name.includes('Mirai') || model.name.includes('Nexo')) {
          incentives.push({ id: "ev-lease-bonus", name: "CA Clean Air / EV Lease Bonus", amount: 7500, type: "rebate", isDefault: true });
        }
        if (model.name.includes('Mirai') || model.name.includes('Nexo')) {
           incentives.push({ id: "hydrogen-fuel-card", name: "$15,000 Fuel Card Included", amount: 0, type: "dealer", isDefault: true });
        }

        return {
          id: `${model.name.toLowerCase().replace(/\s+/g, '-')}-${trim.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: trim.name,
          year: 2026,
          msrp: trim.msrp,
          savings: savings, // STRICTLY 0
          mf: Number(mf.toFixed(5)),
          rv: Number(rv.toFixed(2)),
          apr: Number(apr.toFixed(2)),
          availableIncentives: incentives
        };
      })
    }))
  }))
};

async function seed() {
  await prisma.siteSettings.upsert({
    where: { id: 'car_db' },
    update: { data: JSON.stringify(carDb) },
    create: { id: 'car_db', data: JSON.stringify(carDb) }
  });
  console.log('Successfully seeded 10 brands with ALL California-specific models/trims and ZERO default savings!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
