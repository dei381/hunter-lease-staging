export interface CarSpec {
  make: string;
  model: string;
  trim: string;
  specs: Record<string, string>;
  features: string[];
  categorizedFeatures: Record<string, string[]>;
}

export const carSpecs: CarSpec[] = [
  {
    make: "Audi",
    model: "Q5",
    trim: "Premium Plus",
    specs: {
      "Engine": "2.0L Turbo I4",
      "Horsepower": "261 hp",
      "Torque": "273 lb-ft",
      "Transmission": "7-Speed S tronic",
      "Drivetrain": "quattro AWD",
      "0-60 mph": "5.7 sec",
      "Top Speed": "130 mph",
      "Cargo Space": "25.8 - 54.0 cu ft"
    },
    features: [
      "Bang & Olufsen 3D Sound System",
      "Audi Virtual Cockpit Plus",
      "Panoramic Sunroof",
      "Top View Camera System",
      "Adaptive Cruise Control",
      "Lane Keeping Assist",
      "Heated Steering Wheel",
      "Wireless Apple CarPlay"
    ],
    categorizedFeatures: {
      "Performance": ["quattro AWD", "Sport Suspension", "Drive Select"],
      "Technology": ["Virtual Cockpit", "MMI Touch Response", "Matrix LED"],
      "Comfort": ["Leather Seats", "3-Zone Climate", "Ambient Lighting"]
    }
  },
  {
    make: "BMW",
    model: "X3",
    trim: "xDrive30i",
    specs: {
      "Engine": "2.0L Turbo I4",
      "Horsepower": "248 hp",
      "Torque": "258 lb-ft",
      "Transmission": "8-Speed Automatic",
      "Drivetrain": "xDrive AWD",
      "0-60 mph": "6.0 sec",
      "Top Speed": "130 mph",
      "Cargo Space": "28.7 - 62.7 cu ft"
    },
    features: [
      "Live Cockpit Professional",
      "Harman Kardon Surround Sound",
      "Panoramic Moonroof",
      "Active Driving Assistant",
      "Parking Assistant Plus",
      "Heated Front Seats",
      "Comfort Access Keyless Entry",
      "Navigation System"
    ],
    categorizedFeatures: {
      "Performance": ["xDrive AWD", "Variable Sport Steering", "M Sport Brakes"],
      "Technology": ["iDrive 7.0", "Head-up Display", "Gesture Control"],
      "Comfort": ["SensaTec Upholstery", "Dual Zone Climate", "Power Tailgate"]
    }
  },
  {
    make: "Tesla",
    model: "Model Y",
    trim: "Long Range",
    specs: {
      "Engine": "Dual Motor Electric",
      "Horsepower": "384 hp",
      "Torque": "376 lb-ft",
      "Transmission": "Single Speed",
      "Drivetrain": "AWD",
      "0-60 mph": "4.8 sec",
      "Top Speed": "135 mph",
      "Range": "310 miles"
    },
    features: [
      "Autopilot",
      "Premium Audio System",
      "Glass Roof",
      "15-inch Touchscreen",
      "Over-the-air Updates",
      "Heated Seats (All)",
      "Wireless Charging",
      "Dashcam & Sentry Mode"
    ],
    categorizedFeatures: {
      "Performance": ["Dual Motor AWD", "Regenerative Braking", "Track Mode"],
      "Technology": ["Full Self-Driving Capability", "Tesla App Control", "V11 Software"],
      "Comfort": ["Vegan Leather", "HEPA Filtration", "Power Folding Seats"]
    }
  }
];

export const getSpecsForCar = (make: string, model: string, trim?: string) => {
  return carSpecs.find(s => 
    s.make.toLowerCase() === make.toLowerCase() && 
    s.model.toLowerCase() === model.toLowerCase() &&
    (!trim || s.trim.toLowerCase() === trim.toLowerCase())
  );
};
