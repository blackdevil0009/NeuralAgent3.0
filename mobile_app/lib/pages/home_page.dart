import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../constants/app_colors.dart';
import '../widgets/gradient_background.dart';
import '../widgets/primary_button.dart';
import '../widgets/glass_card.dart';
import 'login_page.dart';
import 'registration_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: CustomScrollView(
          slivers: [
            _buildAppBar(context),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 40),
                    _buildHeroSection(context),
                    const SizedBox(height: 60),
                    _buildStatsGrid(),
                    const SizedBox(height: 60),
                    _buildFeaturesSection(context),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      backgroundColor: Colors.transparent,
      floating: true,
      elevation: 0,
      centerTitle: false,
      title: Row(
        children: [
          const Icon(Icons.spa, color: AppColors.gold, size: 28),
          const SizedBox(width: 8),
          Text(
            'VaidyaMed-X',
            style: GoogleFonts.playfairDisplay(
              color: AppColors.gold,
              fontWeight: FontWeight.bold,
              fontSize: 22,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          onPressed: () {},
          icon: const Icon(Icons.menu, color: AppColors.white),
        ),
      ],
    );
  }

  Widget _buildHeroSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.gold.withOpacity(0.14),
            borderRadius: BorderRadius.circular(50),
            border: Border.all(color: AppColors.gold.withOpacity(0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.auto_awesome, color: AppColors.amber, size: 14),
              const SizedBox(width: 6),
              Text(
                'NEURAL AGENT 3.0',
                style: GoogleFonts.poppins(
                  color: AppColors.amber,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        RichText(
          text: TextSpan(
            style: GoogleFonts.playfairDisplay(
              fontSize: 40,
              height: 1.2,
              fontWeight: FontWeight.bold,
              color: AppColors.white,
            ),
            children: [
              const TextSpan(text: 'Modern Healthcare '),
              TextSpan(
                text: 'Rooted in Ayurveda',
                style: GoogleFonts.playfairDisplay(
                  color: AppColors.amber,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Precise Diagnosis, Ancient Wisdom, and Personalized Care powered by advanced AI.',
          style: GoogleFonts.poppins(
            color: AppColors.white.withOpacity(0.7),
            fontSize: 16,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 32),
        Row(
          children: [
            Expanded(
              child: PrimaryButton(
                text: 'Get Started',
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegistrationPage())),
                icon: Icons.rocket_launch,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: PrimaryButton(
                text: 'Learn More',
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginPage())),
                isSecondary: true,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatsGrid() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildStatItem('12K+', 'Active Patients'),
        _buildStatItem('150+', 'Expert Vaidyas'),
        _buildStatItem('98%', 'AI Accuracy'),
      ],
    );
  }

  Widget _buildStatItem(String number, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          number,
          style: GoogleFonts.playfairDisplay(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.amber,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.poppins(
            color: AppColors.white.withOpacity(0.5),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildFeaturesSection(BuildContext context) {
    return Column(
      children: [
        Center(
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.gGreen.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(50),
                  border: Border.all(color: AppColors.gGreen.withOpacity(0.2)),
                ),
                child: Text(
                  'WHY CHOOSE US',
                  style: GoogleFonts.poppins(
                    color: AppColors.gLight,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Intelligent Healing',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 28,
                  color: AppColors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 40),
        _buildFeatureCard(
          'AI Diagnosis',
          'Sequential LSTM models for precise health pattern recognition.',
          FontAwesomeIcons.robot,
          '01',
        ),
        const SizedBox(height: 20),
        _buildFeatureCard(
          'Ayurvedic Analysis',
          'In-depth Dosha identification and herbal recommendations.',
          FontAwesomeIcons.leaf,
          '02',
        ),
        const SizedBox(height: 20),
        _buildFeatureCard(
          'Global Records',
          'Secure clinical caching layer for lightning-fast history access.',
          FontAwesomeIcons.shieldHalved,
          '03',
        ),
      ],
    );
  }

  Widget _buildFeatureCard(String title, String desc, IconData icon, String index) {
    return StaticGlassCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.gLight.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColors.gPale, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.poppins(
                        color: AppColors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      index,
                      style: GoogleFonts.playfairDisplay(
                        color: AppColors.white.withOpacity(0.1),
                        fontSize: 40,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  desc,
                  style: GoogleFonts.poppins(
                    color: AppColors.white.withOpacity(0.6),
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
