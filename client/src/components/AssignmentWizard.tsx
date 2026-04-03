import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play } from "lucide-react";

export const TEACHERS = [
  "Amna Hasan Abdulla Alshamsi",
  "Muneera Mabkhot Saeed Al Kqahali",
  "Neama Mohamed Ibrahim Elgamil",
  "Fatima Abdulla Salem Manea Alseiari",
  "Salha Sulaiman Sheikhmus",
  "Nadya Mustafa Matawa",
  "Amna Mustafa Abdulla Mustafa Alhashmi",
  "Asmaa Abdulla Ibrahim Jasem Alhammadi",
  "Sameya Hasan Omar",
  "Rosaila Abdel Hamid Hasan Souri",
  "Abir Abdel Fattah Ali Hegazy",
  "Hanan Fawwaz Mahmoud Tayfour",
  "Abeer M A Shalash",
  "Salsabeel Bassam Shehadeh Naser",
  "Yasmeen Omar Hussein Hamida",
  "Maryam Salem Farhan Alhammadi",
  "Anoud Mousa Ibrahim Abdulla Alblooshi",
  "Reema Chhetri",
  "Norhan Khaled Marzouk Amin Elsayed",
  "Riham Saleh Elsaid Ahmed Hassan",
  "Zahinabath Sakeya Abdul Rahiman Sali",
  "Arti Thakur",
  "Rasha Saleh Ahmed Hasan Almessabi",
  "Naledi Noxolo Bhengu",
  "Salma Shahnawaz Shaikh",
  "Huda Hasan Mohamed Kamal Alali",
  "Holly Catherine Myburgh",
  "Sajida Bibi Younus",
  "Liesil Elizabeth Williams",
  "Sumeera Nazir Ahmed Shuroo",
  "Kholiwe Mangazha",
];

export function AssignmentWizard() {
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [, setLocation] = useLocation();

  return (
    <Card className="glass-card border-white/20 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl bg-primary w-32 h-32 rounded-full pointer-events-none"></div>
      <CardHeader>
        <CardTitle className="text-2xl font-black">Select Your Teacher</CardTitle>
        <CardDescription className="text-muted-foreground font-medium">
          Please select your teacher from the dropdown below to begin your project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10 w-full max-w-2xl">
        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
          <SelectTrigger className="w-full h-14 bg-white/5 border-white/20 hover:bg-white/10 transition-colors font-medium text-lg">
            <SelectValue placeholder="Select a teacher..." />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {TEACHERS.map((teacher) => (
              <SelectItem key={teacher} value={teacher} className="cursor-pointer font-medium py-3">
                {teacher}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedTeacher && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-2">
            <Button
              className="w-full h-14 text-lg font-bold premium-gradient text-white flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
              onClick={() => setLocation(`/project-submission`)}
            >
              Submit your project
              <Play className="w-5 h-5 ml-2 fill-current" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
